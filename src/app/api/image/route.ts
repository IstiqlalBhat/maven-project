import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { apiRateLimiter } from '@/lib/rate-limiter';
import { sanitizeString } from '@/lib/validation';

// Initialize with explicit API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface ImageRequest {
    prompt: string;
}

export async function POST(request: NextRequest) {
    // Rate limiting
    const rateLimitResponse = apiRateLimiter(request);
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    try {
        const { prompt }: ImageRequest = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // Sanitize and limit prompt length
        const sanitizedPrompt = sanitizeString(prompt, 500);
        if (!sanitizedPrompt) {
            return NextResponse.json({ error: 'Valid prompt is required' }, { status: 400 });
        }

        const enhancedPrompt = `Professional baseball photography style: ${sanitizedPrompt}. High quality, dynamic action shot, photorealistic.`;

        try {
            // Try image generation model
            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash-exp-image-generation",
                contents: `Generate an image: ${enhancedPrompt}`,
            });

            // Check for image in response
            const candidates = response.candidates;
            if (candidates && candidates[0]?.content?.parts) {
                for (const part of candidates[0].content.parts) {
                    const partAny = part as { inlineData?: { mimeType: string; data: string } };
                    if (partAny.inlineData) {
                        return NextResponse.json({
                            success: true,
                            image: {
                                mimeType: partAny.inlineData.mimeType,
                                data: partAny.inlineData.data
                            }
                        });
                    }
                }
            }

            return NextResponse.json({
                success: false,
                message: response.text || 'Image generation is not available.',
                fallback: true
            });

        } catch (modelError) {
            console.error('Image model error:', modelError);

            // Fallback: Return a description
            const descResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Describe in vivid detail what this image would look like: ${enhancedPrompt}`
            });

            return NextResponse.json({
                success: false,
                message: descResponse.text,
                fallback: true,
                note: 'Image generation unavailable. Here is a description instead.'
            });
        }

    } catch (error) {
        console.error('Image API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate image. Please try again.' },
            { status: 500 }
        );
    }
}

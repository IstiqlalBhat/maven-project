import SignUpForm from "@/components/Auth/SignUpForm";

export default function RegisterPage() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
            <SignUpForm />
        </div>
    );
}

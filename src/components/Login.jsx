import { useGoogleLogin } from '@react-oauth/google';
import { GraduationCap } from 'lucide-react';
import logo from '../assets/logo.png';

export function Login({ onSuccess }) {
    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            console.log('Token response:', tokenResponse);
            onSuccess(tokenResponse.access_token);
        },
        onError: (error) => {
            console.log('Login Failed:', error);
            alert('Login failed. Please try again.');
        },
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-8 max-w-md w-full text-center hover:shadow-3xl transition-shadow duration-500">
                <div className="flex justify-center mb-8">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            src={logo}
                            alt="Kensington Primary School Logo"
                            className="relative w-24 h-24 object-contain drop-shadow-sm transform group-hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                </div>

                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-800 to-orange-600 bg-clip-text text-transparent mb-3">
                    Kensington Primary School
                </h1>

                <p className="text-gray-600 mb-8 leading-relaxed">
                    Sign in with your Google account to access your student performance insights.
                </p>

                <button
                    onClick={() => login()}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-medium py-3.5 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        className="w-5 h-5 group-hover:scale-110 transition-transform"
                    />
                    <span>Sign in with Google</span>
                </button>

                <p className="mt-8 text-xs text-gray-400 font-medium">
                    Secure access required • Authorised personnel only
                </p>
            </div>
        </div>
    );
}

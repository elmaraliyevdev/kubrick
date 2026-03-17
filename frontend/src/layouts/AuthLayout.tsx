// import { useState } from "react";
// import { ArrowRight } from "lucide-react";
// import { GalleryVerticalEnd } from "lucide-react";

// interface LoginProps {
//   onLogin: () => void;
//   onSwitchToSignUp: () => void;
// }

// // type AuthLayoutProps = {
// //   form: React.ReactNode; // pass either <LoginForm /> or <RegisterForm />
// // };

// // export default function AuthLayout({ form }: AuthLayoutProps) {
// export function Login({ onLogin, onSwitchToSignUp }: LoginProps) {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     onLogin();
//   };
//   // return (
//   //   <div className="grid min-h-svh lg:grid-cols-2">
//   //     <div className="flex flex-col gap-4 p-6 md:p-10">
//   //       <div className="flex justify-center gap-2 md:justify-start">
//   //         <a href="#" className="flex items-center gap-2 font-medium">
//   //           <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
//   //             <GalleryVerticalEnd className="size-4" />
//   //           </div>
//   //           Kubrick
//   //         </a>
//   //       </div>
//   //       <div className="flex flex-1 items-center justify-center">
//   //         <div className="w-full max-w-xs">{form}</div>
//   //       </div>
//   //     </div>
//   //     <div className="bg-muted relative hidden lg:block">
//   //       <img
//   //         src="/placeholder.svg"
//   //         alt="Auth"
//   //         className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
//   //       />
//   //     </div>
//   //   </div>
//   // );
//   return (
//     <div className="min-h-screen bg-[#F7F7F7] flex">
//       {/* Left Side - Form */}
//       <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
//         <div className="w-full max-w-[420px]">
//           {/* Logo */}
//           <div className="mb-12">
//             <div className="flex items-center gap-2">
//               <div className="w-9 h-9 bg-[#3B82F6] rounded-lg flex items-center justify-center">
//                 <span className="text-white font-semibold text-[16px]">K</span>
//               </div>
//               <span className="text-[20px] font-semibold text-[#111827]">Kubrick HR</span>
//             </div>
//           </div>

//           {/* Form */}
//           <div>
//             <h1 className="mb-8">Sign in to your account</h1>

//             <form onSubmit={handleSubmit} className="space-y-5">
//               <div>
//                 <label
//                   htmlFor="email"
//                   className="block text-[13px] font-medium text-[#111827] mb-2"
//                 >
//                   Email address
//                 </label>
//                 <input
//                   id="email"
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   className="w-full h-11 px-4 bg-white border border-[#E5E5E5] rounded-lg text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] transition-colors"
//                   placeholder="Enter your email"
//                   required
//                 />
//               </div>

//               <div>
//                 <label
//                   htmlFor="password"
//                   className="block text-[13px] font-medium text-[#111827] mb-2"
//                 >
//                   Password
//                 </label>
//                 <input
//                   id="password"
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   className="w-full h-11 px-4 bg-white border border-[#E5E5E5] rounded-lg text-[14px] text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] transition-colors"
//                   placeholder="Enter your password"
//                   required
//                 />
//               </div>

//               <div className="flex items-center justify-between">
//                 <label className="flex items-center gap-2 cursor-pointer">
//                   <input
//                     type="checkbox"
//                     className="w-4 h-4 border border-[#E5E5E5] rounded text-[#3B82F6] focus:ring-0 focus:ring-offset-0"
//                   />
//                   <span className="text-[13px] text-[#6B7280]">Remember me</span>
//                 </label>
//                 <button
//                   type="button"
//                   className="text-[13px] text-[#3B82F6] font-medium hover:underline"
//                 >
//                   Reset password
//                 </button>
//               </div>

//               <button
//                 type="submit"
//                 className="w-full h-11 bg-[#3B82F6] text-white rounded-lg text-[14px] font-medium hover:bg-[#2563EB] transition-colors"
//               >
//                 Sign in
//               </button>
//             </form>

//             {/* Divider */}
//             <div className="flex items-center gap-4 my-6">
//               <div className="flex-1 h-px bg-[#E5E5E5]"></div>
//               <span className="text-[13px] text-[#9CA3AF]">Or continue with</span>
//               <div className="flex-1 h-px bg-[#E5E5E5]"></div>
//             </div>

//             {/* Social Login */}
//             <div className="space-y-3">
//               <button className="w-full h-11 bg-white border border-[#E5E5E5] rounded-lg text-[14px] font-medium text-[#111827] hover:bg-[#F9F9F9] transition-colors flex items-center justify-center gap-3">
//                 <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
//                   <path
//                     d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
//                     fill="#4285F4"
//                   />
//                   <path
//                     d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
//                     fill="#34A853"
//                   />
//                   <path
//                     d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
//                     fill="#FBBC05"
//                   />
//                   <path
//                     d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
//                     fill="#EA4335"
//                   />
//                 </svg>
//                 Sign in with Google
//               </button>

//               <button className="w-full h-11 bg-white border border-[#E5E5E5] rounded-lg text-[14px] font-medium text-[#111827] hover:bg-[#F9F9F9] transition-colors flex items-center justify-center gap-2">
//                 Continue with SSO
//                 <ArrowRight size={16} strokeWidth={1.5} />
//               </button>
//             </div>

//             {/* Sign Up Link */}
//             <div className="mt-6 text-center">
//               <span className="text-[14px] text-[#6B7280]">Don't have an account? </span>
//               <button
//                 onClick={onSwitchToSignUp}
//                 className="text-[14px] text-[#3B82F6] font-medium hover:underline"
//               >
//                 Sign up here
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Right Side - Illustration */}
//       <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] items-center justify-center p-12">
//         <div className="max-w-lg">
//           <div className="bg-white rounded-2xl shadow-lg border border-[#E5E5E5] p-8 mb-6 transform rotate-2">
//             <div className="space-y-4">
//               <div className="flex items-center gap-3">
//                 <div className="w-12 h-12 bg-[#E5E7EB] rounded-full"></div>
//                 <div className="flex-1 space-y-2">
//                   <div className="h-3 bg-[#F3F4F6] rounded w-3/4"></div>
//                   <div className="h-3 bg-[#F3F4F6] rounded w-1/2"></div>
//                 </div>
//               </div>
//               <div className="h-px bg-[#E5E5E5]"></div>
//               <div className="space-y-2">
//                 <div className="h-3 bg-[#F3F4F6] rounded w-full"></div>
//                 <div className="h-3 bg-[#F3F4F6] rounded w-5/6"></div>
//                 <div className="h-3 bg-[#F3F4F6] rounded w-4/6"></div>
//               </div>
//             </div>
//           </div>
//           <div className="bg-white rounded-2xl shadow-lg border border-[#E5E5E5] p-8 transform -rotate-1">
//             <div className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <div className="h-4 bg-[#3B82F6] rounded w-1/3"></div>
//                 <div className="h-8 w-8 bg-[#F3F4F6] rounded-full"></div>
//               </div>
//               <div className="grid grid-cols-3 gap-3">
//                 <div className="h-16 bg-[#F3F4F6] rounded"></div>
//                 <div className="h-16 bg-[#F3F4F6] rounded"></div>
//                 <div className="h-16 bg-[#F3F4F6] rounded"></div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

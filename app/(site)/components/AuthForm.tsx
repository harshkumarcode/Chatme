"use client";
import axios from "axios";
import { useState, useCallback, useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/app/components/inputs/Input";
import Button from "@/app/components/Button";
import AuthSocialButton from "./AuthSocialButton";
import { FcGoogle } from "react-icons/fc";
import { BsGithub } from "react-icons/bs";

import { toast } from "react-hot-toast";

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from "next/navigation";
import LoadingModal from "@/app/components/modals/LoadingModal";
import { sub } from "date-fns";

type Variant = "LOGIN" | "REGISTER" | "FORGOT_PASSWORD" | "VERIFY_OTP" | "CHANGE_PASSWORD";
type subVariant = "VERIFY_OTP_CREATE_USER_CALL" | "VERIFY_OTP_CHANGE_PASSWORD_CALL" | ''

const AuthForm = () => {
    const session = useSession()
    const router = useRouter()
    const [variant, setVariant] = useState<Variant>('LOGIN');
    const [isLoading, setIsLoading] = useState(false);
    const [subVariant, setSubVariant] = useState<subVariant>('');

    useEffect(() => {
        if (session?.status === 'authenticated') {
            console.log(session?.status)
            router.push('/users')
        }
    }, [session?.status, router])

    const toggleVariant = useCallback(() => {
        if (variant === 'LOGIN') {
            ;
            setVariant('REGISTER');
        } else {
            setVariant('LOGIN');
        }
    }, [variant]);

    const { register, handleSubmit, formState: { errors } } = useForm<FieldValues>({
        defaultValues: {
            name: '',
            email: '',
            password: '',
        }
    })

    const [otpObj, setOtpObj] = useState({ email: '', otp: '' })

    const verifyOtp = (inputOtp: string, generatedOtp: string) => {
        console.log(inputOtp, generatedOtp)
        if (inputOtp === generatedOtp) {
            return true;
        }
        return false;
    }

    const [countdown, setCountdown] = useState(180);
    useEffect(() => {
        if (subVariant === 'VERIFY_OTP_CREATE_USER_CALL' || subVariant === 'VERIFY_OTP_CHANGE_PASSWORD_CALL') {
            let timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
            setTimeout(() => {
                toast.error("OTP expired!");
                setVariant('LOGIN');
                setSubVariant('');
                setOtpObj({ email: '', otp: '' });
                clearInterval(timer);
            }, 180000);
            setCountdown(180);
        }
    }, [subVariant])


    const onSubmit: SubmitHandler<FieldValues> = (data) => {
        setIsLoading(true);

        if (variant === 'REGISTER') {
            axios.post('/api/register/generateotp', data)
                .then((d) => {
                    setOtpObj({ email: data.email, otp: d.data.toString() });
                    toast.success("OTP sent successfully!");
                    setVariant('VERIFY_OTP');
                    setSubVariant('VERIFY_OTP_CREATE_USER_CALL');
                })
                .catch((error) => toast.error(error.response.data.message))
                .finally(() => { setIsLoading(false) });
            setSubVariant('');
        }

        if (variant === "VERIFY_OTP" && subVariant === 'VERIFY_OTP_CREATE_USER_CALL') {
            if (!verifyOtp(data.otp, otpObj.otp)) {
                toast.error("Invalid OTP!");
                setIsLoading(false)
                return;
            }
            axios.post('/api/register/createuser', data)
                .then(() => signIn('credentials', {
                    ...data,
                    redirect: false,
                }))
                .then((callback) => {
                    if (callback?.error) {
                        toast.error("Invalid Credentials!");
                    }

                    if (callback?.ok && !callback?.error) {
                        router.push('/users')
                        toast.success("Account created successfully!");
                    }
                })
                .catch((error) => toast.error(error.response.data.message))
                .finally(() => setIsLoading(false));
        }

        if (variant === 'FORGOT_PASSWORD') {
            axios.post('/api/password/verifyemail', data)
                .then((d) => {
                    setOtpObj({ email: data.email, otp: d.data.toString() });
                    toast.success("OTP sent successfully!");
                    setVariant('VERIFY_OTP');
                    setSubVariant('VERIFY_OTP_CHANGE_PASSWORD_CALL');
                })
                .catch((error) => toast.error(error.response.data.message))
                .finally(() => { setIsLoading(false) });
        }

        if (variant === 'VERIFY_OTP' && subVariant === 'VERIFY_OTP_CHANGE_PASSWORD_CALL') {
            if (!verifyOtp(data.otp, otpObj.otp)) {
                toast.error("Invalid OTP!");
                setIsLoading(false)
                return;
            }
            setVariant('CHANGE_PASSWORD');
            setIsLoading(false)
            setSubVariant('');
        }

        if (variant === 'CHANGE_PASSWORD' && subVariant === '') {
            if (data.newpassword !== data.confirmPassword) {
                toast.error("Passwords do not match!");
                setIsLoading(false)
                return;
            }
            axios.post('/api/password/changepassword', { email: otpObj.email, password: data.newpassword })
                .then(() => {
                    toast.success("Password changed successfully! Please login to continue.");
                    setVariant('LOGIN')
                })
                .catch((error) => toast.error(error.response.data.message))
                .finally(() => setIsLoading(false));
        }


        if (variant === 'LOGIN') {
            signIn('credentials', {
                ...data,
                redirect: false,
            })
                .then((callback) => {
                    if (callback?.error) {
                        toast.error("Invalid Credentials!");
                    }

                    if (callback?.ok && !callback?.error) {
                        toast.success("Logged in successfully!");
                        router.push('/conversations')
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }


    const socialAction = (action: string) => {
        setIsLoading(true);
        signIn(action, { redirect: false })
            .then((callback) => {
                if (callback?.error) {
                    toast.error("Invalid credentials!");
                }

                if (callback?.ok && !callback?.error) {
                    router.push('/conversations')
                    toast.success("Logged in successfully!");
                }
            })
            .finally(() => setIsLoading(false));
    }

    return (
        <>
            {
                isLoading && <LoadingModal />
            }

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
                <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        {variant === 'FORGOT_PASSWORD' && (
                            <p className="text-gray-500 text-sm">Enter your email address to get OTP to reset your password.</p>
                        )}

                        {variant === 'REGISTER' && (
                            <Input id="name" label="Name" register={register} errors={errors} disabled={isLoading} required />
                        )}

                        {variant === 'VERIFY_OTP' ? (
                            <>
                                <p className="text-gray-600 text-base" >Enter the OTP sent to <span className="text-sky-500">{otpObj.email}</span>.</p>
                                <p className="text-gray-500 text-sm">If you did not get the otp, please check your <span className="text-rose-500"> spam folder</span>.</p>
                                <Input id="otp" label="OTP" register={register} errors={errors} disabled={isLoading} maxLength={6} required />

                                <p className="text-sm text-gray-500">OTP will expire in {countdown} sec</p>

                            </>
                        ) : variant === 'CHANGE_PASSWORD' ? (
                            <>
                                <Input id="newpassword" label="Password" type="password" register={register} errors={errors} disabled={isLoading} required />
                                <Input id="confirmPassword" label="Confirm Password" type="password" register={register} errors={errors} disabled={isLoading} required />
                            </>
                        ) :
                            <Input id="email" label="Email" type="email" register={register} errors={errors} disabled={isLoading} required />
                        }

                        {(variant === 'REGISTER' || variant === 'LOGIN') && (
                            <Input id="password" label="Password" type="password" register={register} errors={errors} disabled={isLoading} required />
                        )}

                        {variant === 'LOGIN' && (
                            <p onClick={() => { setVariant('FORGOT_PASSWORD') }} className="text-sm text-sky-500 cursor-pointer text-end">Forgot your password?</p>
                        )}

                        <div>
                            <Button disabled={isLoading} fullWidth type="submit" >{variant === "LOGIN" ? "Sign in" : (variant === "FORGOT_PASSWORD" ? "Send OTP" : variant == "VERIFY_OTP" ? "Verify OTP" : variant === 'CHANGE_PASSWORD' ? 'Change Password' : "Register")}</Button>
                        </div>
                    </form>

                    {(variant === 'LOGIN' || variant === 'REGISTER') && (
                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <AuthSocialButton text="Github" icon={BsGithub} onClick={() => socialAction('github')} />
                                <AuthSocialButton text="Google" icon={FcGoogle} onClick={() => socialAction('google')} />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 justify-center text-sm mt-6 px-2 text-gray-500">
                        <div>
                            {variant === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
                        </div>
                        <div className="text-sky-500 cursor-pointer" onClick={toggleVariant}>
                            {variant === 'LOGIN' ? "Register" : "Login"}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AuthForm;
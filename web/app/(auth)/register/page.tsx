import AuthLayout from "@/components/AuthLayout";
import { SignupForm } from "@/components/signup-form";
import "@/components/AuthForms.css";

export default function RegisterPage() {
  return <AuthLayout bare title="" subtitle=""><SignupForm /></AuthLayout>;
}

import AuthLayout from "@/components/AuthLayout";
import { LoginForm } from "@/components/login-form";
import "@/components/AuthForms.css";

export default function LoginPage() {
  return <AuthLayout bare title="" subtitle=""><LoginForm /></AuthLayout>;
}

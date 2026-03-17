import { LoginPasswordForm } from "@/components/auth/LoginPasswordForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginOtpForm } from "./auth/LoginOtpForm";

export function LoginForm() {
  return (
    <Tabs defaultValue="password" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="otp">Email Code</TabsTrigger>
      </TabsList>

      <TabsContent value="password">
        <LoginPasswordForm />
      </TabsContent>

      <TabsContent value="otp">
        <LoginOtpForm />
      </TabsContent>
    </Tabs>
  );
}


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: AuthFormValues, isSignUp: boolean) => {
    setIsLoading(true);
    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({
            email: values.email,
            password: values.password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        : await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });

      if (error) {
        if (
          error.message.includes("User already registered") ||
          error.message.includes("already exists")
        ) {
          toast({
            title: "Account already exists",
            description: "Please sign in instead.",
          });
          setActiveTab("signin");
          form.reset();
          return;
        }
        throw error;
      }

      if (isSignUp) {
        toast({
          title: "Verification email sent",
          description: "Please check your email to verify your account.",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-50">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]"
            style={{
              animation: 'fadeInAndScale 1s ease-out forwards, pulseGlow 3s ease-in-out infinite'
            }}
          ></div>
          <div 
            className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-accent/20 rounded-full blur-[80px]"
            style={{
              animation: 'fadeInAndFloat 1.2s ease-out forwards, floatAnimation 4s ease-in-out infinite',
              animationDelay: '0.3s'
            }}
          ></div>
          <div 
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[90px]"
            style={{
              animation: 'fadeInAndRotate 1.5s ease-out forwards, rotateGlow 5s linear infinite',
              animationDelay: '0.6s'
            }}
          ></div>
        </div>
      </div>

      <Card className="w-full max-w-md relative backdrop-blur-sm bg-card/80 animate-fadeIn">
        <CardHeader className="space-y-4">
          <div className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Largest Rewards Giveaway in History
            </CardTitle>
            <CardDescription className="text-xl font-semibold text-primary">
              Enter Now to Claim Your Stake
            </CardDescription>
          </div>
          <CardDescription className="text-center">
            Sign in or create an account to manage your holdings and participate in the giveaway
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Form {...form}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit((values) => onSubmit(values, false))();
                }} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="signup">
              <Form {...form}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit((values) => onSubmit(values, true))();
                }} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <style>
        {`
          @keyframes fadeInAndScale {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.8);
            }
            100% {
              opacity: 0.5;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          @keyframes pulseGlow {
            0%, 100% {
              opacity: 0.5;
              transform: translate(-50%, -50%) scale(1);
            }
            50% {
              opacity: 0.7;
              transform: translate(-50%, -50%) scale(1.1);
            }
          }

          @keyframes fadeInAndFloat {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 0.5;
              transform: translateY(0);
            }
          }

          @keyframes floatAnimation {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          @keyframes fadeInAndRotate {
            0% {
              opacity: 0;
              transform: rotate(0deg);
            }
            100% {
              opacity: 0.5;
              transform: rotate(360deg);
            }
          }

          @keyframes rotateGlow {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

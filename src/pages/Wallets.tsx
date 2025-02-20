import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogOut, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProjectName = "DEBT" | "CHRS" | "ALUM" | "BAUX" | "BGLD" | "OIL" | "DCM" | "DATA" | "DLG" | "GDLG" | "GROW" | "FARM" | "NATG" | "NGAS" | "XPLR" | "EXPL";

const walletSchema = z.object({
  address: z.string().min(42, "Invalid wallet address").max(42, "Invalid wallet address"),
});

const holdingsSchema = z.object({
  project_name: z.enum(["DEBT", "CHRS", "ALUM", "BAUX", "BGLD", "OIL", "DCM", "DATA", "DLG", "GDLG", "GROW", "FARM", "NATG", "NGAS", "XPLR", "EXPL"]),
  total_nfts: z.number().min(0, "Must be 0 or greater"),
  micro_nfts: z.number().min(0, "Must be 0 or greater"),
  total_tokens: z.number().min(0, "Must be 0 or greater"),
  piggy_bank_tokens: z.number().min(0, "Must be 0 or greater"),
});

type WalletFormValues = z.infer<typeof walletSchema>;
type HoldingsFormValues = z.infer<typeof holdingsSchema>;

const projectOptions: { value: ProjectName; label: string }[] = [
  { value: "DEBT", label: "DEBT" },
  { value: "DLG", label: "DLG" },
  { value: "ALUM", label: "ALUM" },
  { value: "XPLR", label: "XPLR" },
  { value: "BGLD", label: "BGLD" },
  { value: "NATG", label: "NATG" },
  { value: "DCM", label: "DCM" },
  { value: "GROW", label: "GROW" },
];

interface TokenHolding {
  id: string;
  project_name: ProjectName;
  total_tokens: number;
  piggy_bank_tokens: number;
}

interface NFTHolding {
  id: string;
  project_name: ProjectName;
  total_nfts: number;
  micro_nfts: number;
}

interface Wallet {
  id: string;
  address: string;
  tokenHoldings: TokenHolding[];
  nftHoldings: NFTHolding[];
}

export default function Wallets() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  const walletForm = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      address: "",
    },
  });

  const holdingsForm = useForm<HoldingsFormValues>({
    resolver: zodResolver(holdingsSchema),
    defaultValues: {
      project_name: "DEBT",
      total_nfts: 0,
      micro_nfts: 0,
      total_tokens: 0,
      piggy_bank_tokens: 0,
    },
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error.message,
      });
    } else {
      navigate("/auth");
    }
  };

  const fetchWallets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: walletsData, error: walletsError } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", user.id);

      if (walletsError) throw walletsError;

      const walletsWithHoldings = await Promise.all(
        walletsData.map(async (wallet) => {
          const [{ data: tokenHoldings }, { data: nftHoldings }] = await Promise.all([
            supabase
              .from("token_holdings")
              .select("*")
              .eq("wallet_id", wallet.id),
            supabase
              .from("nft_holdings")
              .select("*")
              .eq("wallet_id", wallet.id),
          ]);

          return {
            ...wallet,
            tokenHoldings: tokenHoldings || [],
            nftHoldings: nftHoldings || [],
          };
        })
      );

      setWallets(walletsWithHoldings);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const fetchOnChainData = async (address: string, project: ProjectName) => {
    if (project !== 'BGLD') return null;
    
    try {
      const { data, error } = await supabase.functions.invoke('query-bgld-holdings', {
        body: { address }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching on-chain data:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const onSubmit = async (values: WalletFormValues) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const onChainData = await fetchOnChainData(values.address, 'BGLD');
      
      if (onChainData) {
        toast({
          title: "On-chain data found",
          description: "We've detected your BGLD holdings from the blockchain.",
        });
      }

      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .insert({
          address: values.address,
          profile_id: user.id,
        })
        .select()
        .single();

      if (walletError) throw walletError;

      if (onChainData && walletData) {
        const { error: nftError } = await supabase
          .from("nft_holdings")
          .insert({
            wallet_id: walletData.id,
            project_name: 'BGLD',
            total_nfts: onChainData.total_nfts,
            micro_nfts: onChainData.micro_nfts,
          });

        if (nftError) throw nftError;
      }

      toast({
        title: "Wallet added",
        description: "Your wallet has been successfully connected.",
      });
      
      walletForm.reset();
      fetchWallets();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitHoldings = async (values: HoldingsFormValues) => {
    if (!selectedWallet) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a wallet first",
      });
      return;
    }

    setIsLoading(true);
    try {
      const [{ data: existingTokenHoldings }, { data: existingNFTHoldings }] = await Promise.all([
        supabase
          .from("token_holdings")
          .select("id")
          .eq("wallet_id", selectedWallet)
          .eq("project_name", values.project_name)
          .maybeSingle(),
        supabase
          .from("nft_holdings")
          .select("id")
          .eq("wallet_id", selectedWallet)
          .eq("project_name", values.project_name)
          .maybeSingle(),
      ]);

      if (existingTokenHoldings?.id) {
        const { error: tokenError } = await supabase
          .from("token_holdings")
          .update({
            total_tokens: values.total_tokens,
            piggy_bank_tokens: values.piggy_bank_tokens,
          })
          .eq("id", existingTokenHoldings.id);

        if (tokenError) throw tokenError;
      } else {
        const { error: tokenError } = await supabase
          .from("token_holdings")
          .insert({
            wallet_id: selectedWallet,
            project_name: values.project_name,
            total_tokens: values.total_tokens,
            piggy_bank_tokens: values.piggy_bank_tokens,
          } as const);

        if (tokenError) throw tokenError;
      }

      if (existingNFTHoldings?.id) {
        const { error: nftError } = await supabase
          .from("nft_holdings")
          .update({
            total_nfts: values.total_nfts,
            micro_nfts: values.micro_nfts,
          })
          .eq("id", existingNFTHoldings.id);

        if (nftError) throw nftError;
      } else {
        const { error: nftError } = await supabase
          .from("nft_holdings")
          .insert({
            wallet_id: selectedWallet,
            project_name: values.project_name,
            total_nfts: values.total_nfts,
            micro_nfts: values.micro_nfts,
          } as const);

        if (nftError) throw nftError;
      }

      toast({
        title: existingTokenHoldings || existingNFTHoldings ? "Holdings updated" : "Holdings added",
        description: `Your holdings have been successfully ${existingTokenHoldings || existingNFTHoldings ? "updated" : "recorded"}.`,
      });
      
      holdingsForm.reset();
      fetchWallets();
    } catch (error: any) {
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
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container max-w-4xl py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">
              Chrysalis
            </Link>
            <Link to="/wallets" className="text-sm font-medium">
              Wallets
            </Link>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="container max-w-4xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Wallets</h1>
            <p className="text-muted-foreground">
              Manage your connected wallets and record your holdings
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Add your wallet address to start managing your holdings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...walletForm}>
              <form onSubmit={walletForm.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={walletForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0x..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Connecting..." : "Connect Wallet"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {wallets.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Record Holdings</CardTitle>
                <CardDescription>
                  Select a wallet and record your project holdings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Select
                  value={selectedWallet || ""}
                  onValueChange={setSelectedWallet}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedWallet && (
                  <Form {...holdingsForm}>
                    <form onSubmit={holdingsForm.handleSubmit(onSubmitHoldings)} className="space-y-4">
                      <FormField
                        control={holdingsForm.control}
                        name="project_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                              <SelectContent>
                                {projectOptions.map((project) => (
                                  <SelectItem key={project.value} value={project.value}>
                                    {project.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={holdingsForm.control}
                          name="total_nfts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Total NFTs
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-4 w-4" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Include both staked and unstaked NFTs</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={holdingsForm.control}
                          name="micro_nfts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Micro NFTs</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={holdingsForm.control}
                          name="total_tokens"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                Tokens in Wallet
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-4 w-4" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Total tokens in your wallet and piggy bank</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={holdingsForm.control}
                          name="piggy_bank_tokens"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Piggy Bank Tokens</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormDescription className="text-sm text-muted-foreground">
                        Note: All wallet holdings will be verified against the blockchain snapshot taken when the ecosystem was shut off. If the numbers don't match, the system will use the on-chain data.
                      </FormDescription>

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Recording..." : "Record Holdings"}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected Wallets</CardTitle>
                <CardDescription>
                  View and manage your connected wallets and their holdings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {wallets.map((wallet) => (
                  <div key={wallet.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{wallet.address}</h3>
                    </div>
                    
                    {wallet.tokenHoldings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Token Holdings</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          {wallet.tokenHoldings.map((token) => (
                            <Card key={token.id}>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="font-medium">{token.project_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Total: {token.total_tokens}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Piggy Bank: {token.piggy_bank_tokens}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {wallet.nftHoldings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">NFT Holdings</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          {wallet.nftHoldings.map((nft) => (
                            <Card key={nft.id}>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="font-medium">{nft.project_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Total: {nft.total_nfts}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Micro NFTs: {nft.micro_nfts}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

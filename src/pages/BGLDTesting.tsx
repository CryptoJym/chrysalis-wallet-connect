
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bug, Check, Terminal, X, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ethers } from "ethers";
import { toast } from "@/hooks/use-toast";

interface TestResult {
  address: string;
  total_nfts: number;
  micro_nfts: number;
  pending_rewards: number;
  error?: string;
}

export default function BGLDTesting() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [bscKey, setBscKey] = useState<string | null>(null);

  useEffect(() => {
    fetchBscKey();
  }, []);

  const fetchBscKey = async () => {
    const { data: apiKey, error: keyError } = await supabase
      .rpc('get_secret', { 
        secret_name: 'BSC_API_KEY'
      });
    
    if (keyError) {
      console.error('Error fetching BSC key:', keyError);
      toast({
        variant: "destructive",
        title: "API Key Error",
        description: "Failed to fetch the BSC API key."
      });
      return;
    }
    
    if (apiKey) {
      setBscKey(apiKey as string);
    } else {
      toast({
        variant: "destructive",
        title: "API Key Not Found",
        description: "BSC API key not found in Supabase settings."
      });
    }
  };

  const testAddress = async () => {
    if (!bscKey) {
      toast({
        variant: "destructive",
        title: "API Key Missing",
        description: "Please make sure your BSC API key is properly set."
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        `https://bnb-mainnet.g.alchemy.com/v2/${bscKey}`
      );

      // Contract addresses
      const BGLD_NFT_ADDRESS = "0x3abedba3052845ce3f57818032bfa747cded3fca";
      const BGLD_MICRO_NFT_ADDRESS = "0x935d2fd458fdf41ca227a009180de5bd32a6d116";
      const BGLD_REWARD_DISTRIBUTOR = "0x0c9fa52d7ed12a6316d3738c80931eccc33937dd";
      const BGLD_REWARD_DISTRIBUTOR_DIAMOND = "0xf751d2849b3659c81f3724814d5a8defb0bb8ad2";

      // Contract ABIs
      const erc721ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function calculatePendingRewards(address user) view returns (uint256)"
      ];

      const erc20ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];

      // Create contract instances
      const bgldNFT = new ethers.Contract(BGLD_NFT_ADDRESS, erc721ABI, provider);
      const bgldMicroNFT = new ethers.Contract(BGLD_MICRO_NFT_ADDRESS, erc20ABI, provider);
      const legacyRewardDistributor = new ethers.Contract(BGLD_REWARD_DISTRIBUTOR, erc721ABI, provider);
      const diamondRewardDistributor = new ethers.Contract(BGLD_REWARD_DISTRIBUTOR_DIAMOND, erc721ABI, provider);

      // Query balances and rewards
      const [
        nftBalance,
        microNFTBalance,
        microDecimals,
        legacyRewards,
        diamondRewards
      ] = await Promise.all([
        bgldNFT.balanceOf(address),
        bgldMicroNFT.balanceOf(address),
        bgldMicroNFT.decimals(),
        legacyRewardDistributor.calculatePendingRewards(address)
          .catch(() => ethers.BigNumber.from(0)),
        diamondRewardDistributor.calculatePendingRewards(address)
          .catch(() => ethers.BigNumber.from(0))
      ]);

      // Calculate final values
      const totalRewards = legacyRewards.add(diamondRewards);
      const microNFTBalanceAdjusted = Number(ethers.utils.formatUnits(microNFTBalance, microDecimals));

      const holdings: TestResult = {
        address,
        total_nfts: nftBalance.toNumber(),
        micro_nfts: microNFTBalanceAdjusted,
        pending_rewards: Number(ethers.utils.formatEther(totalRewards))
      };

      setResult(holdings);

      // Store results in database
      const { error: dbError } = await supabase
        .from('nft_holdings')
        .upsert({
          wallet_id: address,
          project_name: 'BGLD',
          total_nfts: holdings.total_nfts,
          micro_nfts: holdings.micro_nfts
        });

      if (dbError) {
        toast({
          variant: "destructive",
          title: "Error storing results",
          description: dbError.message
        });
      }

    } catch (error: any) {
      setResult({
        address,
        total_nfts: 0,
        micro_nfts: 0,
        pending_rewards: 0,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">BGLD Holdings Test (BSC)</h1>
          <p className="text-muted-foreground">
            Test wallet addresses and store results in database
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Address</CardTitle>
            <CardDescription>
              Enter an address to test BGLD holdings on BSC
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input 
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <Button 
                onClick={testAddress} 
                disabled={isLoading || !address || !bscKey}
              >
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Bug className="mr-2 h-4 w-4" />
                    Test
                  </>
                )}
              </Button>
            </div>

            {!bscKey && (
              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertTitle>API Key Missing</AlertTitle>
                <AlertDescription>
                  Please make sure your BSC API key is properly set in Supabase.
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="space-y-4">
                {result.error ? (
                  <Alert variant="destructive">
                    <X className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertTitle>Results for {result.address}</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1 font-mono text-sm">
                        <div>NFTs: {result.total_nfts}</div>
                        <div>Micro NFTs: {result.micro_nfts}</div>
                        <div>Pending Rewards: {result.pending_rewards}</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Debug Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-secondary p-4 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

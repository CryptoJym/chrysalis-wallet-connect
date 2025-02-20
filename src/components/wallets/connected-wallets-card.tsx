
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TokenHolding, NFTHolding } from "@/types/wallet";

interface ConnectedWalletsCardProps {
  wallets: Array<{
    id: string;
    address: string;
    tokenHoldings: TokenHolding[];
    nftHoldings: NFTHolding[];
  }>;
}

export function ConnectedWalletsCard({ wallets }: ConnectedWalletsCardProps) {
  return (
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
                  {wallet.tokenHoldings.map((token, index) => (
                    <Card key={`${wallet.id}-token-${index}`}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="font-medium">{token.projectName}</div>
                          <div className="text-sm text-muted-foreground">
                            Total: {token.totalTokens}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Piggy Bank: {token.piggyBankTokens}
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
                  {wallet.nftHoldings.map((nft, index) => (
                    <Card key={`${wallet.id}-nft-${index}`}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="font-medium">{nft.projectName}</div>
                          <div className="text-sm text-muted-foreground">
                            Total: {nft.totalNFTs}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Micro NFTs: {nft.microNFTs}
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
  );
}

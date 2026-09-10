import { getAppConfig } from "@/lib/config/appConfig";
import { ACTIVE_CHAIN } from "@/lib/chain/robinhood";

/**
 * The public half of the runtime config: what the browser needs to render the
 * right token. Read from the database so an operator repointing the game in
 * /admin takes effect on the next request rather than the next deploy.
 */
export async function GET() {
  const config = await getAppConfig();

  return Response.json(
    {
      tokenAddress: config.tokenAddress,
      tokenTicker: config.tokenTicker,
      treasuryAddress: config.treasuryAddress,
      stakeEscrowAddress: config.stakeEscrowAddress,
      siloTargetEth: config.siloTargetEth,
      tokenLive: Boolean(config.tokenAddress),
      chainId: ACTIVE_CHAIN.id,
      explorer: ACTIVE_CHAIN.blockExplorers?.default.url ?? null,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      },
    },
  );
}

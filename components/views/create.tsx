import { useWeb3React } from "@web3-react/core";
import { Contract, ethers, BigNumber } from "ethers";
import { useState } from "react";

import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
} from "@mui/material";

const TOKEN_LOGO = {
  busd: "/icons/tokens/binance-usd-busd-logo.svg",
  usdc: "/icons/tokens/usd-coin-usdc-logo.svg",
  eth: "/icons/tokens/ethereum-eth-logo.svg",
  btc: "/icons/tokens/bitcoin-btc-logo.svg",
};

const underlyingAssets = [
  { id: 0, name: "BTC", icon: TOKEN_LOGO.btc },
  { id: 1, name: "ETH", icon: TOKEN_LOGO.eth },
  { id: 2, name: "USDC", icon: TOKEN_LOGO.usdc },
  { id: 3, name: "BUSD", icon: TOKEN_LOGO.busd },
];

interface AssetType {
  id: number;
  name: string;
  icon: string;
}

export default function CreatePage() {
  const { active, account, library, connector, chainId, activate, deactivate } =
    useWeb3React();

  const [dexIndex, setDexIndex] = useState<number>(0);
  const [currentDex, setCurrentDex] = useState<string>("Pancakeswap");

  const toggleDexIndex = (index: number) => {
    setDexIndex(index);
    if (index === 0) {
      setCurrentDex("Pancakeswap");
    } else if (index === 1) {
      setCurrentDex("Safemoon Swap");
    } else {
      setCurrentDex("");
    }
  };

  const [assetIndex, setAssetIndex] = useState<number>(0);

  const toggleAssetIndex = (index: number) => {
    setAssetIndex(index);
  };

  const generate = () => {
    console.log("Generating");
  };

  const [feePercent, setFeePercent] = useState<number>(100);
  const handleFeePercent = (percent: number) => {
    setFeePercent(percent);
  };

  const renderTab = () => {
    return (
      <>
        <Stack
          spacing={2}
          className="text-center flex flex-col justify-center align-middle"
        >
          <Typography color="#21bbb1" className="text-2xl font-bold">
            Create Appreciating Wrapped Tokens
          </Typography>
          <Typography color="#21bbb1" className="text-lg font-mono">
            Zero Cost | 10% Of Taxes Go To XUSD
          </Typography>
          <Stack className="lg:w-6/12 xl:w-5/12 mb-8 mt-8 self-center">
            <div>
              <div className="text-left mb-1 text-zinc-400">
                Underlying Asset Address:
              </div>

              <div className="flex flex-wrap md:flex-nowrap md:flex-row items-center justify-between">
                {underlyingAssets.map((asset: AssetType) => {
                  return (
                    <div
                      key={asset.id}
                      onClick={() => toggleAssetIndex(asset.id)}
                      className={`${
                        assetIndex === asset.id
                          ? "border-color-brand"
                          : "border-color-normal"
                      } mb-3 w-5/12 md:w-[140px] h-[50px] py-3 px-1 flex items-center justify-center cursor-pointer`}
                    >
                      <img
                        src={asset.icon}
                        alt={asset.name}
                        className="mr-1 w-[30px] h-[30px]"
                      />
                      <div className="text-bold">{asset.name}</div>
                    </div>
                  );
                })}
                <div
                  onClick={() => toggleAssetIndex(underlyingAssets.length)}
                  className={`${
                    assetIndex === underlyingAssets.length
                      ? "border-color-brand"
                      : "border-color-normal"
                  } mb-3 w-full md:w-[140px] h-[50px] cursor-pointer flex items-center justify-center`}
                >
                  Custom
                </div>
              </div>
              {assetIndex === underlyingAssets.length && (
                <input
                  type="text"
                  id="tokenName"
                  name="tokenName"
                  color="black"
                  value={"0xca966222f97aF0dDB83C59F3C228a2fb493035aC"}
                  //onChange={e => changeTokenName(e.target.value)}
                  className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
                />
              )}
            </div>
            <div>
              <div className="text-left mb-1 text-zinc-400">
                New Token Name:
              </div>
              <input
                type="text"
                id="tokenName"
                name="tokenName"
                color="black"
                value={"XTrader Token"}
                //onChange={e => changeTokenName(e.target.value)}
                className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
              />
            </div>
            <div>
              <div className="text-left mb-1 text-zinc-400">
                New Token Symbol (ticker):
              </div>
              <input
                type="text"
                id="tokenSymbol"
                name="tokenSymbol"
                color="black"
                value={"XTUST"}
                //onChange={e => changeTokenSymbol(e.target.value)}
                className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
              />
            </div>
            <div className="mb-4">
              <div className="text-left mb-1 text-zinc-400">
                DEX To Buy Underlying Asset:
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div
                  onClick={() => toggleDexIndex(0)}
                  className={`${
                    dexIndex === 0
                      ? "border-color-brand"
                      : "border-color-normal"
                  } mb-3 w-full md:w-[180px] h-[80px] py-3 px-1 flex items-center justify-center cursor-pointer`}
                >
                  <img
                    src="/icons/pancake.svg"
                    alt="pancake"
                    className="mr-1"
                    width="48px"
                    height="48px"
                  />
                  <div className="text-bold">PancakeSwap</div>
                </div>
                <div
                  onClick={() => toggleDexIndex(1)}
                  className={`${
                    dexIndex === 1
                      ? "border-color-brand"
                      : "border-color-normal"
                  } mb-3 w-full md:w-[180px] h-[80px] py-3 px-1 flex items-center justify-center cursor-pointer`}
                >
                  <img
                    src="/icons/safemoon-logo.png"
                    alt="safemoon-logo"
                    className="mr-1"
                  />
                  <img
                    src="/icons/safemoon-logo-letter.svg"
                    alt="safemoon-logo-text"
                  />
                </div>
                <div
                  onClick={() => toggleDexIndex(2)}
                  className={`${
                    dexIndex === 2
                      ? "border-color-brand"
                      : "border-color-normal"
                  } mb-3 w-full md:w-[180px] h-[80px] cursor-pointer flex items-center justify-center`}
                >
                  Custom
                </div>
              </div>
            </div>
            {dexIndex === 2 && (
              <div className="mb-4">
                <input
                  type="text"
                  id="tokenAddress"
                  name="tokenAddress"
                  color="black"
                  value={currentDex}
                  onChange={(e) => setCurrentDex(e.target.value)}
                  className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
                />
              </div>
            )}
            <div className="flex justify-between">
              <div className="mr-3">
                <div className="text-left mb-1 text-zinc-400">Mint Fee:</div>
                <input
                  type="text"
                  id="mintPrice"
                  name="mintPrice"
                  color="black"
                  value={"0.75%"}
                  //onChange={e => changeMintCost(e.target.value)}
                  className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
                />
              </div>
              <div className="mr-3">
                <div className="text-left mb-1 text-zinc-400">Sell Fee:</div>
                <input
                  type="text"
                  id="mintPrice"
                  name="mintPrice"
                  color="black"
                  value={"0.25%"}
                  //onChange={e => changeMintCost(e.target.value)}
                  className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
                />
              </div>
              <div>
                <div className="text-left mb-1 text-zinc-400">
                  Transfer Fee:
                </div>
                <input
                  type="text"
                  id="mintPrice"
                  name="mintPrice"
                  color="black"
                  value={"0.25%"}
                  //onChange={e => changeMintCost(e.target.value)}
                  className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
                />
              </div>
            </div>
            <div>
              <div className="text-left mb-1 text-zinc-400">Owner Address:</div>
              <input
                type="text"
                id="tokenSymbol"
                name="tokenSymbol"
                color="black"
                value={"0x234..234234"}
                //onChange={e => changeTokenSymbol(e.target.value)}
                className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
              />
            </div>
            <div>
              <div className="text-left mb-1 text-zinc-400">
                Percentage Of Fee To Raise Token Price (Auto Set 100%):
              </div>
              <input
                type="text"
                id="feePercent"
                name="feePercent"
                color="black"
                value={feePercent}
                onChange={(e) => handleFeePercent(Number(e.target.value))}
                className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
              />
            </div>
            {feePercent < 100 && (
              <div>
                <div className="text-left mb-1 text-zinc-400">
                  Fee Recipient Address:
                </div>
                <input
                  type="text"
                  id="feeRecipient"
                  name="feeRecipient"
                  color="black"
                  value={"0x234..234234"}
                  //onChange={e => changeTokenSymbol(e.target.value)}
                  className="w-full mb-4 text-white bg-transparent px-3 py-2 rounded-lg border border-border-1"
                />
              </div>
            )}
            <Button
              className="mt-8 bg-green-500 text-black hover:bg-[#F3F4F6] hover:text-black capitalize text-lg"
              onClick={() => generate()}
            >
              Generate Appreciating Asset
            </Button>
            {/* <Protected showWarning={false}>
                            <div className="mt-8 text-center">
                            <p>NFTs Generated:</p>
                            {showNFTsGenerated()}
                            </div>
                        </Protected> */}
          </Stack>
        </Stack>
      </>
    );
  };

  return (
    <Box className="flex justify-center">
      {account && library ? (
        <>
          {/* <Card sx={{ maxWidth: '42rem', margin: '0 auto' }}> */}
          <Card className="w-full">
            <CardContent>
              <Stack spacing={3}>{renderTab()}</Stack>
            </CardContent>
          </Card>
        </>
      ) : (
        <Typography variant="h6" gutterBottom>
          Please connect your wallet
        </Typography>
      )}
    </Box>
  );
}

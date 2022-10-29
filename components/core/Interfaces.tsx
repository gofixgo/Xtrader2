import { AbstractConnector } from "@web3-react/abstract-connector";
import { Contract } from "ethers";


export interface ITokenHolding {
    /** The symbol of the token (always uppercase): SETH */
    symbol: string,
    /** The line containing balanceOf, valueOf, price, priceInBNB, priceInUSD, fees, and underlyingAsset */
    holdings: ITokenHoldingLine
}

export interface ITokenHoldingLine {
    /** Quantity of SurgeTokens held in your wallet */
    balanceOf: Number,
    /** Value of your Surge Tokens in the underlying token's representation: 4211910608 sETH = 0.0351 ETH */
    valueOf: Number,
    /** The price of ONE SurgeToken in the underlying asset's representation.  1 sETH = 0.000000008071675 ETH */
    price: Number,
    /** The price of ONE SurgeToken in BNB.  1 sETH = 0.000000000060592917 BNB */
    priceInBNB: Number,
    /** The price of ONE SurgeToken in BUSD.  1 sETH = 0.0000000365142 BUSD */
    priceInUSD: Number,
    /** The line for the fees (buy, sell, transfer and staking of the token) */
    fees: IFees,
    /** The line containing the data of the underlying asset (symbol, balanceOf) */
    underlyingAsset: IUnderlyingAsset
}

export interface IFees {
    /** Tax fee when selling the SurgeToken */
    sellFee: Number,
    /** Tax fee when buying the SurgeToken */
    buyFee: Number,
    /** Tax fee when transfering the SurgeToken between wallets */
    transferFee: Number,
    /** Tax fee when staking (converting underlying asset into SurgeTokens via contract method) */
    stakeFee: Number
}

export interface IUnderlyingAsset {
    /** The symbol of the underlying asset (always uppercase): ETH */
    symbol: string,
    /** The balance of the underlying asset held in your wallet: 1 BNB */
    balanceOf: Number
}

export interface IConnectorConfig {
    /** common name of the selected connector: MetaMask, WalletConnect, etc */
    name: string,
    /** type of the selected connector: injected, walletconnect, etc */
    connector: AbstractConnector,
    /** Image logo representing the connector */
    logo: StaticImageData
}

export interface IContract {
    /** contract address */
    address: string,
    /** contract ABI */
    abi: string
}



//-------------------------------------------------------------------------------------------------------------//


export interface IStateType {
    /** toggle for the wallet connection dialog box */
    isConnectDialogActive: boolean,
    /** the state for wen the user is connected to their wallet */
    isConnected: boolean,
    /** Interface for the selected connector config (name, connector, logo) */
    activeConnector: IConnectorConfig | null,
    /** Interface for all the different surge tokens */
    wallet: ITokenHolding[]
}

export interface IToken {
    address: string,
    abi: string,
    symbol: string,
    decimals: number,
    is_surged: false,
    UnderlyingToken: {
        address: string,
        abi: string,
        symbol: string,
    },
}
export interface ILPToken {
    address: string,
    abi: string,
    symbol: string,
}
export interface IFarmData {
    address: string,
    abi: string,
    BaseToken: IToken,
    PairedToken:IToken,
    LPToken: ILPToken
}
export interface IPoolData {
    StakingContract: Contract,
    poolBalanceOfUser: {
        XUSD: string,
        USD: string,
    }
    XUSDLocked: string,
    overallProfit: {
        XUSD: string,
        USD: string,
    },
    totalLiquidity: string,
    approvalNeeded: boolean,
    rewardToken: string,
    poolName: string,
    APR: string,
    unstakeTimeBlocks: number,
    leaveEarlyFee: string,
    pendingRewards: string,
    rewardPrice: string
}
export interface IXUSDData {
    Contract: Contract,
    Price: string,
    userXUSDBalance: string
}
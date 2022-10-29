import { createGlobalState } from 'react-hooks-global-state';
import { IFarmData, IPoolData, IXUSDData } from './Interfaces'
const poolData: IPoolData = null;
const pools: IPoolData[] = [];
const XUSDData: IXUSDData = null;
const initialState = {
    BNBbalance: 0,
    tabValue: 0,
    XUSDData: XUSDData,
    generalTokenInfo: {},
    wallet: [{
        symbol: "",
        holdings: {
            balanceOf: 0,
            valueOf: 0,
            price: 0,
            priceInBNB: 0,
            priceInUSD: 0,
            fees: {
                sellFee: 0,
                buyFee: 0,
                transferFee: 0,
                stakeFee: 0
            },
            underlyingAsset: {
                symbol: "",
                balanceOf: 0
            }
        }
    }],
    tokenPrices:{
        priceInUnderlying: 0,
        priceInBNB: 0,
        priceInUSD: 0,
    },
    poolData: poolData,
    pools: pools,
    poolTotal: {
        XUSD: "0.00",
        USD: "0.00",
    },
    userBalances:{},
    depositedFarms: {},
    availableFarms: {},
    totalRewards: "0.00",
    totalFarmsValue: "0.00",
    priceOfBNB: {
        raw: undefined,
        formatted: "0.00"
    },
    windowSize: {
        width: undefined,
        height: undefined,
    },
    rerun: true,
    swapCardType:0,
    stableSwapCardType:0,
    liquidityTabState:{
        pairedToken: {
            contract: null,
            symbol: "",
            decimals: 0,
            userBalanceToken: 0,
          },
          baseToken: {
            contract: null,
            symbol: "",
            decimals: 0,
            userBalanceToken: 0,
          }
    }
}
export const { useGlobalState, setGlobalState, getGlobalState } = createGlobalState(initialState);

// import { createGlobalState } from 'react-hooks-global-state';

// const { useGlobalState } = createGlobalState({ FarmsFarms: 0 });

// const Component = () => {
//   const [Farms, setFarms] = useGlobalState('Farms');
//   ...
// };
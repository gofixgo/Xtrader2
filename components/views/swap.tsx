import { Card, CardContent, Typography, CardActions, Button, Tooltip, Toolbar, Tab, Tabs, FormControl, InputLabel, InputAdornment, MenuItem, Select, Stack, TextField, Slider, CardHeader, Grid, Divider, Link, ButtonGroup, Badge, SelectChangeEvent, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Box, display } from "@mui/system";
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import AddIcon from '@mui/icons-material/Add';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { useWeb3React } from "@web3-react/core";
import { Contract, ethers, BigNumber } from "ethers";
import React, { useEffect } from "react";
import { useService, useIsMobile } from "../core/Service";
import { useGlobalState } from "../core/StateManager";
// import { getGeneralTokenInfo } from "../core/Service";
import { BNB, BUSD, pcsRouter, xUSDV2, xSwap_router } from "../wallet/Contracts";
import { useSnackbar } from 'notistack';
import { debounce } from "lodash";
import { formatStringWithCommas, getPriceOfTokenInToken, unwrap, wrap, approve, TxHandler } from '../core/Utils';
import { pancakeRouter, pancakeFactory, BNBContract, BUSDContract, isApprovalRequired, getAmountsOut, MaxSafeInteger, allowance } from '../core/Utils';
import { gql, useQuery } from '@apollo/client';
import { messagePrefix } from "@ethersproject/hash";
import { TransactionResponse, TransactionReceipt } from "@ethersproject/providers";
import { priceInBNB } from "../core/Utils";
import MenuTab from "../ui/MenuTab";

interface IFees {
  sell: number;
  buy: number;
  stake: number;
  transfer: number;
}

interface IToken {
  contract: Contract;
  symbol: string;
  decimals: number;
  tokenPrice: number;
  tokenFee: IFees;
  userBalanceToken: number;
  priceInBNB: number;
  priceInUSD: number;
}

interface SToken {
  token: IToken;
  underlying: IToken;
  tokenPriceInUnderlying: number;
}

interface ISwapState {
  topToken: SToken | IToken;
  botToken: SToken | IToken;
  userBalanceBNB: number;
  estimatedRecieved: number;
  buyValue: number;
  sellValue: number;
  stakeValue: number;
}

interface ITokenQuery {
  name: string
  symbol: string
  address: string
  abi: string
  decimals: number
  is_surged: boolean
  stakeable: boolean
  transfer_fee: number
  stake_fee: number
  sell_fee: number
  buy_fee: number
  UnderlyingToken: {
    name: string
    symbol: string
    address: string
    abi: string
    decimals: number
    is_surged: boolean
    stakeable: boolean
    transfer_fee: number
    stake_fee: number
    sell_fee: number
    buy_fee: number
  }
}

const getTokenQuery = gql`
query GetTokens {
  Tokens(where: {is_lp: {_eq: false}}) {
    name
    symbol
    address
    abi
    decimals
    is_surged
    stakeable
    transfer_fee
    stake_fee
    sell_fee
    buy_fee
    UnderlyingToken {
      name
      symbol
      address
      abi
      decimals
      is_surged
      stakeable
      transfer_fee
      stake_fee
      sell_fee
      buy_fee
    }
  }
}
`

function DisplayHighPriceimpactWarning(props) {
  const { onClose, open, swapState } = props;

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog onClose={handleClose} open={open}>
      <DialogTitle>Price Impact Too High</DialogTitle>
      <DialogContent>
        {swapState.topToken.token.symbol == "xUSD" && swapState.botToken.token.symbol == "BNB" ? (
          <Box>
            <Typography>
              To swap with zero price impact, please select <span style={{ textDecoration: 'underline', color: "#21bbb1" }}>BUSD</span>, <span style={{ textDecoration: 'underline', color: "#21bbb1" }}>USDC</span>,
              or <span style={{ textDecoration: 'underline', color: "#21bbb1" }}>USDT</span> instead. This avoids the Panakeswap LP, and interacts directly with the contract.
            </Typography>
            <Typography>You could also lower the amount you want to swap if you choose to proceed in this manner.</Typography>
          </Box>
        ) :
          (
            <Typography>Please lower the amount you want to swap to decrease your price impact. This swap will be using Pancakeswap LP.</Typography>
          )}
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={handleClose}>
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  )

  // DisplayHighPriceimpactWarning.propTypes = {
  //   onClose: PropTypes.func.isRequired,
  //   open: PropTypes.bool.isRequired,
  // };
}

export default function Swap() {
  const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();
  // stable swap token states
  const [stableSwapState, setStableSwapState] = React.useState({
    fromToken: '',
    toToken: '',
    fromAmount: '',
    toAmount: '',
    fromTokenBalance: '',
    toTokenBalance: '',
    swapFee: { maxFee: false, flat: "0", percent: "0" },
    tokensList: ["BUSD", "USDT", "USDC"],
    fromTokensList: [],
    toTokensList: []
  });
  const updateStableSwapState = (name, value) => {
    setStableSwapState({
      ...stableSwapState,
      [name]: value
    });
  };

  const [highImpactWarningOpen, setHighImpactWarningOpen] = React.useState(false)

  React.useEffect(() => {
    if (active && account) {
      updateStableSwapState('fromTokensList', stableSwapState.tokensList.filter(token => token !== stableSwapState.toToken))
      updateStableSwapState('toTokensList', stableSwapState.tokensList.filter(token => token !== stableSwapState.fromToken))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, account, stableSwapState.tokensList, stableSwapState.toToken, stableSwapState.fromToken]);


  const handleFromTokenChange = (event: SelectChangeEvent) => {
    updateStableSwapState('fromToken', event.target.value);
    // setFromToken(event.target.value);
  };
  const handleToTokenChange = (event: SelectChangeEvent) => {
    updateStableSwapState('toToken', event.target.value);
    // setToToken(event.target.value);
  };

  const reverseStableFromToTokens = () => {
    let temp = stableSwapState.toToken
    updateStableSwapState('toToken', stableSwapState.fromToken)
    updateStableSwapState('fromToken', temp)

    // setToToken(fromToken);
    // setFromToken(temp);
  };

  const [topValue, setTopValue] = React.useState('');
  const [botValue, setBotValue] = React.useState('');
  const [generalTokenInfo, setGeneralTokenInfo] = useGlobalState('generalTokenInfo');
  const [isError, setError] = React.useState(false);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [isApprovalNeeded, setApprovalNeeded] = React.useState(true);
  const [liquidityApprovals, setLiquidityApprovals] = React.useState([true, true])
  const [reverseButtonShown, setReverseButtonShown] = React.useState(false);
  const [router, setRouter] = React.useState(pancakeRouter);
  const [xSwapRouter, set_xSwapRouter] = React.useState<Contract>();
  const [cardType, setCardType] = useGlobalState('swapCardType');// React.useState(0); 
  const { loading, error, data } = useQuery(getTokenQuery);
  const [initialized, setInitialized] = React.useState(false);
  const [isHighPriceImpact, setHighPriceImpact] = React.useState(false);
  const [availableList, setAvailableList] = React.useState([]);

  const [priceImpact, setPriceImpact] = React.useState("0");
  const [expectedFee, setExpectedFee] = React.useState("0");

  const [userState, setUserState] = React.useState({
    bnbBalance: "0"
  })

  const [swapPrices, setSwapPrices] = React.useState({
    swap: {
      topPrice: "0",
      botPrice: "0"
    }
  })
  const [stableSymbols, setStableSymbols] = React.useState(["BUSD", "USDC"]);

  const [swapState, setSwapState] = React.useState({
    topToken: {
      token: {
        contract: null,
        symbol: "",
        decimals: 0,
        tokenPrice: 0,
        tokenFee: {
          sell: 0,
          buy: 0,
          stake: 0,
          transfer: 0,
        },
        userBalanceToken: 0,
        priceInBNB: 0,
        priceInUSD: 0,
      },
      underlying: {
        contract: null,
        symbol: "",
        decimals: 0,
        tokenPrice: 0,
        tokenFee: {
          sell: 0,
          buy: 0,
          stake: 0,
          transfer: 0,
        },
        userBalanceToken: 0,
        priceInBNB: 0,
        priceInUSD: 0,
      },
      tokenPriceInUnderlying: 0,
      isSurged: false,
      underlyingSymbol: "",
    },
    botToken: {
      token: {
        contract: null,
        symbol: "",
        decimals: 0,
        tokenPrice: 0,
        tokenFee: {
          sell: 0,
          buy: 0,
          stake: 0,
          transfer: 0,
        },
        userBalanceToken: 0,
        priceInBNB: 0,
        priceInUSD: 0,
      },
      underlying: {
        contract: null,
        symbol: "",
        decimals: 0,
        tokenPrice: 0,
        tokenFee: {
          sell: 0,
          buy: 0,
          stake: 0,
          transfer: 0,
        },
        userBalanceToken: 0,
        priceInBNB: 0,
        priceInUSD: 0,
      },
      tokenPriceInUnderlying: 0,
      isSurged: false,
      underlyingSymbol: "",
    },
    userBalanceBNB: 0,
    estimatedRecieved: 0,
    buyValue: 0,
    sellValue: 0,
    stakeValue: 0,
  });

  //** the state for the liquidity section of the Swap page */
  const [liquidityState, setLiquidityState] = useGlobalState('liquidityTabState');
  const [rerun, setRerun] = useGlobalState('rerun');
  const [localRerun, setLocalRerun] = React.useState(0);
  const [availableTokens, setAvailableTokens] = React.useState([]);
  const [stableTokens, setStableTokens] = React.useState([]);
  const [allSurgeTokens, setAllSurgeTokens] = React.useState([]);
  const [PCSSwappableTokens, setPCSSwappableTokens] = React.useState([]);
  const [allNonBNBTokens, setAllNonBNBTokens] = React.useState([]);
  const [pairingAssetsInFarm, setPairingAssetsInFarm] = React.useState([]);
  const [stableBalances, setStableBalances] = React.useState({});
  const [maxAmountToSwap, setMaxAmountToSwap] = React.useState("0");


  const updateStableBalances = async () => {
    const mapped_stablebalancesinxUSD = await Promise.all(stableSymbols.map(async (symbol) => {
      const balOf = await generalTokenInfo[symbol]?.contract?.balanceOf(xUSDV2.address)
      return { "symbol": symbol, "balance": ethers.utils.formatEther(balOf ? balOf : BigNumber.from(0)) }
    }));
    if (swapState.botToken.token.contract !== null && swapState.botToken.token.contract !== undefined) {
      setMaxAmountToSwap(ethers.utils.formatEther(await swapState.botToken.token.contract.balanceOf(xUSDV2.address)));
    }
    setStableBalances(mapped_stablebalancesinxUSD);
  }

  React.useEffect(() => {
    if (swapState.botToken != undefined && initialized) {
      updateStableBalances()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapState.botToken])

  const enum SwapType {
    CONTRACT_SELL,
    CONTRACT_BUY,
    CONTRACT_STAKE,
    PCS_SWAP_SINGLE,
    PCS_SWAP_MULTI,
    STABLE_SWAP,
    NONE
  }
  const expectedColor = (calculatedOutput, expectedOutput): string => {
    // if(calculatedOutput < expectedOutput){return '#00ee00'}
    // if(calculatedOutput > expectedOutput){return '#ee0000'}
    // if(calculatedOutput == expectedOutput){return '#ffffff'}
    return "#ffffff"
  }
  const refresh = () => {
    fetchBNBBalance();
    Promise.all([
      updateTokenList(swapState.topToken.token.symbol),
      updateExternalPrices(swapState),
      updateStableBalances()
    ]).then(() => {
      handleInputChange(topValue, true)
    });
  }

  const calculateSwapType = (topTokenS: string, bottomTokenS: string): SwapType => {

    if (!topTokenS) {
      return SwapType.NONE;
    }
    if (!bottomTokenS) {
      return SwapType.NONE;
    }

    if (topTokenS === 'sUSD' || topTokenS === 'sETH') {
      return SwapType.CONTRACT_SELL;
    }

    if (topTokenS === 'USDC' || topTokenS === 'BUSD' || topTokenS === 'USDT') {
      if (bottomTokenS === 'xUSD') {
        return SwapType.CONTRACT_STAKE;
      }
    }

    const topToken = generalTokenInfo[topTokenS];
    const bottomToken = generalTokenInfo[bottomTokenS];

    if (!topToken) {
      return SwapType.NONE;
    }
    if (!bottomToken) {
      return SwapType.NONE;
    }

    if (stableSymbols.includes(topTokenS) && stableSymbols.includes(bottomTokenS)) {
      return SwapType.STABLE_SWAP;
    }

    if (topTokenS === 'xUSD') {

      if (bottomToken.is_surged || bottomTokenS === 'BNB') {
        return SwapType.PCS_SWAP_SINGLE;
      } else if (bottomTokenS === 'BUSD' || bottomTokenS === 'USDC' || bottomTokenS === 'USDT') {
        return SwapType.CONTRACT_SELL;
      }

    }

    if (topToken.is_surged) {

      if (bottomTokenS === 'xUSD') {
        return SwapType.PCS_SWAP_SINGLE;
      } else if (bottomToken.is_surged || bottomTokenS === 'BNB') {
        return SwapType.PCS_SWAP_MULTI;
      } else if (topToken.UnderlyingToken.address === bottomToken.address) {
        return SwapType.CONTRACT_SELL;
      }

    } else if (topTokenS === 'BNB') {

      if (bottomToken.is_surged) {
        return SwapType.CONTRACT_BUY;
      } else {
        return SwapType.PCS_SWAP_SINGLE;
      }

    }

    if (topTokenS === bottomToken.UnderlyingToken?.symbol) {
      return SwapType.CONTRACT_STAKE;
    }

    if (bottomTokenS === 'BNB') {
      return SwapType.PCS_SWAP_SINGLE;
    }

    if (topTokenS === 'xUSD' || bottomTokenS === 'xUSD' || topTokenS === 'BNB' || bottomTokenS === 'BNB') {
      return SwapType.PCS_SWAP_SINGLE;
    }

    if (canBeSingleSwapped(topTokenS) && canBeSingleSwapped(bottomTokenS)) {
      return SwapType.PCS_SWAP_SINGLE;
    }

    return SwapType.NONE;
  }


  const handleCloseHighImpactWarning = () => {
    setHighImpactWarningOpen(false)
  }


  const handleSwap = async () => {
    if (isHighPriceImpact) {
      setHighImpactWarningOpen(true)
    }
    else {
      if (swapState.topToken.token === undefined || swapState.botToken.token === undefined) {
        return;
      }

      const swapType = calculateSwapType(swapState.topToken.token.symbol, swapState.botToken.token.symbol);
      if (swapType !== SwapType.NONE) {
        executeSwap(swapType, swapState.topToken.token, swapState.botToken.token)
      }
    }
  }

  const executeSwap = (swapType: SwapType, topToken: IToken, bottomToken: IToken) => {

    switch (swapType) {
      case SwapType.CONTRACT_BUY:
        executeBuy(bottomToken);
        break;
      case SwapType.CONTRACT_SELL:
        executeSell(topToken);
        break;
      case SwapType.CONTRACT_STAKE:
        executeContractStake(topToken, bottomToken);
        break;
      case SwapType.PCS_SWAP_MULTI:
        executePCSMultiSwap(topToken, bottomToken);
        break;
      case SwapType.PCS_SWAP_SINGLE:
        executePCSSingleSwap(topToken, bottomToken);
        break;
      case SwapType.STABLE_SWAP:
        executeStableSwap(topToken, bottomToken);
        break;
      default:
    }

  }

  const getSurgeForUnderlying = (symbol) => {
    let list = [];
    for (let i = 0; i < allSurgeTokens.length; i++) {
      if (symbol === allSurgeTokens[i].UnderlyingToken?.symbol) {
        list.push(allSurgeTokens[i].symbol);
      }
    }
    return list;
  }

  const pairsWithXUSD = (symbol) => {
    return symbol === 'USELESS';
  }

  const tokenIsSwappable = (symbol) => {
    return symbol !== 'sETH' && symbol !== 'sUSD' && symbol !== 'sUSELESS' && symbol !== 'sADA' && symbol !== 'sBTC' && symbol !== 'SUSE';
  }

  const sort = (arr) => {
    if (!arr) return [];
    const sArr = arr.sort(function (a, b) {
      return a.is_surged && b.is_surged ? 0 : a.is_surged ? -1 : 1;
    })
    return sArr;
  }

  const generateTokenList = (tokenChosen): any[] => {
    if (!tokenChosen) {
      return [];
    }
    if (!tokenChosen.symbol) {
      return [];
    }
    let list: any = [];

    if (tokenChosen.symbol === 'BNB') {
      return allNonBNBTokens;
    } else {
      if (tokenChosen.underlyingSymbol !== undefined && (!tokenChosen.stakeable || !tokenIsSwappable(tokenChosen.symbol))) {
        if (tokenChosen.underlyingSymbol != tokenChosen.symbol) {
          const underlying = generalTokenInfo[tokenChosen.underlyingSymbol];
          if (underlying !== undefined) {
            list.push(underlying);
          }
        }
      }
      if (!tokenIsSwappable(tokenChosen.symbol)) {
        return list;
      }
    }
    if (tokenChosen.symbol !== "BUSD" && stableSymbols.includes(tokenChosen.symbol)) {
      list.push(generalTokenInfo['xUSD'])
    }

    if (tokenChosen.is_surged) {
      // add all tokens that have a PCS pool
      if (tokenIsSwappable(tokenChosen.symbol)) {

        pairingAssetsInFarm.map(token => {
          if (token !== tokenChosen.symbol) {
            const TOKEN = generalTokenInfo[token];
            list.push(TOKEN)
          }
        })
      }

      // add underlying asset
      if (tokenChosen.stakeable) {
        if (tokenChosen.symbol === 'xUSD') {
          list.push(generalTokenInfo['BUSD']);
          list.push(generalTokenInfo['USDC']);
          list.push(generalTokenInfo['USDT']);
        } else {
          const underlyingT = generalTokenInfo[tokenChosen.underlyingSymbol];
          if (underlyingT !== undefined) {
            list.push(underlyingT);
          }
        }
      }
    } else {
      // add Surge Token for asset
      const surgeList = getSurgeForUnderlying(tokenChosen.symbol);

      if (surgeList.length > 0) {
        const first = generalTokenInfo[surgeList[0]];
        if (first.stakeable) {
          list.push(first);
        }

        if (surgeList.length > 1) {
          const second = generalTokenInfo[surgeList[1]];
          if (second.stakeable) {
            list.push(second);
          }
        }
      }

      // Add BNB For Asset
      const _bnb = generalTokenInfo['BNB'];
      list.push(_bnb)

      if (pairsWithXUSD(tokenChosen.symbol)) {
        const x = generalTokenInfo['xUSD'];
        list.push(x);
      }

      if (canBeSingleSwapped(tokenChosen.symbol)) {
        const symbolList = ['ADA', 'ETH', 'BUSD', 'BTC', 'USDC', 'USDT'];
        for (let i = 0; i < symbolList.length; i++) {
          if (symbolList[i] != tokenChosen.symbol) {
            if (tokenChosen.symbol === 'BUSD' && (symbolList[i] === 'USDC' || symbolList[i] === 'USDT')) {
              continue;
            }
            const x = generalTokenInfo[symbolList[i]];
            list.push(x);
          }
        }
      }
    }
    return sort(list);
    // TOP Token Will Have ALL Options To Choose From
    // Bottom List Will Be Limited Based On Top
  }

  const canBeSingleSwapped = (symbol: string) => {
    return symbol === 'ADA' || symbol === 'ETH' || symbol === 'BUSD' || symbol === 'BTC'
  }

  /** yeet bnb here */
  const executeBuy = (surgeToken: IToken) => {
    if (surgeToken.symbol === 'xUSD') {
      buyXUSD(surgeToken);
    } else if (surgeToken.symbol === 'SUSE') {
      buyWithNative(surgeToken);
    } else {
      buyToken(surgeToken);
    }
  }

  /** being a paperhands little bitch here */
  const executeSell = (surgeToken: IToken) => {
    sellToken(surgeToken)
  }

  /** stake underlying asset into surgeToken here */
  const executeContractStake = (underlyingToken: IToken, surgeToken: IToken) => {
    stakeToken(surgeToken, underlyingToken)
  }

  const executeStableSwap = (fromStable: IToken, toStable: IToken) => {
    stableSwap(fromStable, toStable)
  }
  /** 
   *  PCS Router: swapTokensForTokensSupportingFeeOnTransferTokens call here
   *  XUSD IS IN THE MIDDLE OF THE path[] array of token addresses
   *  [ topToken, XUSD, botToken ]
   */
  const executePCSMultiSwap = (topToken: IToken, botToken: IToken) => {  // ok nvm, its the only one

    if (topToken.contract == undefined || botToken.contract == undefined) {
      return;
    }

    if (topToken.contract.address === botToken.contract.address) {
      return;
    }

    const val = unwrap(wrap(topValue, -1 * topToken.decimals)).split(".")[0];
    const deadline = BigNumber.from('10').pow(17).toString()
    let overrides = {
      gasLimit: 350000
    };

    const botVal = getBotValueStringForCalls(botToken.decimals);
    const XUSD = generalTokenInfo['xUSD'].contract;
    
    const pendingMsg = `pending swap of ${val} ${topToken.symbol} for ${botValue} ${botToken.symbol}`;
    const successMsg = `successfully swapped ${val} ${topToken.symbol} for ${botValue} ${botToken.symbol}`
    const errorMsg = `error swapping ${val} ${topToken.symbol} for ${botValue} ${botToken.symbol}`
    if (botToken.symbol === 'BNB') {
      // Tokens For BNB
      const tx:Promise<TransactionResponse> = router.swapExactTokensForETHSupportingFeeOnTransferTokens(
        val,
        botVal,//unwrap(wrap(botValue, botToken.decimals)), // add some slack here
        [topToken.contract.address, XUSD.address, BNB.address],
        account,
        deadline,
        overrides
      )
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
      
    } else if (topToken.symbol === 'BNB') {
      // BNB For Tokens
      const tx:Promise<TransactionResponse> = router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        val,
        botVal,//unwrap(wrap(botValue, botToken.decimals)), // add slack
        [BNB.address, XUSD.address, botToken.contract.address],
        account,
        deadline,
        overrides
      )
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
      
    } else {
      // Tokens For Tokens
      const tx:Promise<TransactionResponse> = router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        val,
        botVal,//unwrap(wrap(botValue, botToken.decimals)), // add slack
        [topToken.contract.address, XUSD.address, botToken.contract.address],
        account,
        deadline,
        overrides
      )
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
      
    }
  }

  /** 
   * Depending on startToken, call:
   * PCS Router: swapExactTokensForETHSupportingFeeOnTransferTokens
   * PCS Router: swapTokensForTokensSupportingFeeOnTransferTokens
   * PCS Router: swapExactETHForTokensSupportingFeeOnTransferTokens
   */
  const executePCSSingleSwap = (topToken: IToken, botToken: IToken) => {
    if (topToken.contract == undefined || botToken.contract == undefined) {
      return;
    }

    if (topToken.contract.address === botToken.contract.address) {
      return;
    }
    const deadline = BigNumber.from('10').pow(17).toString()
    const val = unwrap(wrap(topValue, -1 * topToken.decimals)).split(".")[0];
    const botVal = getBotValueStringForCalls(botToken.decimals)

    let ethOverrides = {
      value: unwrap(wrap(topValue, -18)).split('.')[0],
      gasLimit: 350000
    };
    let overrides = {
      gasLimit: 350000
    };
    const pendingMsg = `pending swap of ${topValue} ${topToken.symbol} for ${botValue} ${botToken.symbol}`;
    const successMsg = `successfully swapped ${topValue} ${topToken.symbol} for ${botValue} ${botToken.symbol}`
    const errorMsg = `error swapping ${topValue} ${topToken.symbol} for ${botValue} ${botToken.symbol}`

    if (botToken.symbol === 'BNB') {
      // Tokens For BNB
      // https://docs.pancakeswap.finance/code/smart-contracts/pancakeswap-exchange/router-v2#swapexacttokensforethsupportingfeeontransfertokens
      const tx:Promise<TransactionResponse> = router.swapExactTokensForETHSupportingFeeOnTransferTokens(
        val,
        botVal,//unwrap(wrap(botValue, botToken.decimals)), // add some slack here
        [topToken.contract.address, BNB.address],
        account,
        deadline,
        overrides // <-- this passes the value for a payable i believe
      )
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);

    } else if (topToken.symbol === 'BNB') {
      // BNB For Tokens
      // https://docs.pancakeswap.finance/code/smart-contracts/pancakeswap-exchange/router-v2#swapexactethfortokenssupportingfeeontransfertokens
      const tx:Promise<TransactionResponse> = router.swapExactETHForTokensSupportingFeeOnTransferTokens(
        // val,
        botVal,//unwrap(wrap(botValue, botToken.decimals)), // add slack
        [BNB.address, botToken.contract.address],
        account,
        deadline,
        ethOverrides
      )
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
      
    } else {
      // Tokens For Tokens
      // https://docs.pancakeswap.finance/code/smart-contracts/pancakeswap-exchange/router-v2#swapexacttokensfortokenssupportingfeeontransfertokens
      const tx:Promise<TransactionResponse> = router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        val,
        botVal,//unwrap(wrap(botValue, botToken.decimals)), // add slack
        [topToken.contract.address, botToken.contract.address],
        account,
        deadline,
        overrides
      )
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
    }
  }

  const getTokenData = (symbol: string) => {

    const token = generalTokenInfo[symbol];
    if (token === undefined) {
      return emptyTokenData();
    }
    const underlying = token.underlyingSymbol ? generalTokenInfo[symbol] : {}
    let underlyingS;

    if (token.underlyingSymbol !== undefined) {

      underlyingS = {
        underlying: {
          contract: underlying.contract,
          symbol: underlying.symbol,
          decimals: underlying.decimals,
          tokenPrice: parseFloat(underlying.valueInBNB),
          tokenFee: {
            sell: underlying.feeStruct.sellFee / 100,
            buy: underlying.feeStruct.buyFee / 100,
            stake: underlying.feeStruct.stakeFee / 100,
            transfer: underlying.feeStruct.transferFee / 100,
          },
          userBalanceToken: parseFloat(underlying.quantity),
          priceInBNB: underlying.valueInBNB,
          priceInUSD: underlying.valueInBUSD,
        }
      }

    } else {
      underlyingS = emptyUnderlyingData();
    }

    return {
      token: {
        contract: token.contract,
        symbol: token.symbol,
        decimals: token.decimals,
        tokenPrice: parseFloat(token.valueInBNB),
        tokenFee: {
          sell: token.feeStruct.sellFee / 100,
          buy: token.feeStruct.buyFee / 100,
          stake: token.feeStruct.stakeFee / 100,
          transfer: token.feeStruct.transferFee / 100,
        },
        userBalanceToken: parseFloat(token.quantity),
        priceInBNB: token.valueInBNB,
        priceInUSD: token.valueInBUSD,
      },
      underlying: underlyingS,
      tokenPriceInUnderlying: token.tokenPriceInUnderlying,
      isSurged: token.isSurged,
      underlyingSymbol: token.underlyingSymbol
    }
  }

  const emptyUnderlyingData = () => {
    return {
      underlying: {
        contract: null,
        symbol: "",
        decimals: 0,
        tokenPrice: 0,
        tokenFee: {
          sell: 0,
          buy: 0,
          stake: 0,
          transfer: 0,
        },
        userBalanceToken: 0,
        priceInBNB: 0,
        priceInUSD: 0,
      }
    }
  }

  const emptyTokenData = () => {
    return {
      token: {
        contract: null,
        symbol: "",
        decimals: 0,
        tokenPrice: 0,
        tokenFee: {
          sell: 0,
          buy: 0,
          stake: 0,
          transfer: 0,
        },
        userBalanceToken: 0,
        priceInBNB: 0,
        priceInUSD: 0,
      },
      underlying: {
        contract: null,
        symbol: "",
        decimals: 0,
        tokenPrice: 0,
        tokenFee: {
          sell: 0,
          buy: 0,
          stake: 0,
          transfer: 0,
        },
        userBalanceToken: 0,
        priceInBNB: 0,
        priceInUSD: 0,
      },
      tokenPriceInUnderlying: 0,
      isSurged: false,
      underlyingSymbol: ""
    }
  }

  const fetchBNBBalance = async () => {
    const bnbBal = await library.getBalance(account);
    const bal = ethers.utils.formatUnits(bnbBal, 'ether');

    setUserState({
      bnbBalance: bal
    });
  }

  const calculateExpectedFees = (topToken: IToken, botToken: IToken) => {

    const swapType = calculateSwapType(topToken.symbol, botToken.symbol);

    if (topToken == undefined || botToken == undefined || swapType === SwapType.NONE) {
      return 0;
    }


    if (swapType === SwapType.CONTRACT_STAKE) {
      return botToken.tokenFee.stake;
    } else if (swapType === SwapType.CONTRACT_SELL) {
      return topToken.tokenFee.sell;
    } else if (swapType === SwapType.CONTRACT_BUY) {
      return botToken.tokenFee.buy;
    } else {

      let fee = 0;

      if (swapType === SwapType.PCS_SWAP_MULTI) {
        fee += 0.0025;
      }

      fee += topToken.tokenFee.transfer != undefined ? topToken.tokenFee.transfer : 0;
      fee += botToken.tokenFee.transfer != undefined ? botToken.tokenFee.transfer : 0;

      return fee;
    }
  }

  /** changes the symbol for bottom and top. : botTokenChanged = True (modifies the bottom Token) */
  const changeTokenSymbol = async (symbol: string, botTokenChanged: boolean) => {

    if (!symbol) return;

    const newToken = getTokenData(symbol);
    const newState = swapState;

    if (botTokenChanged) {
      // update bottom token state
      newState.botToken = newToken;
      setSwapState({ ...newState })
      handleInputChange(topValue, true);
    } else {
      // update top token state
      newState.topToken = newToken;
      setSwapState({ ...newState })

      updateTokenList(newToken.token.symbol);

      if (topValue != botValue && swapState.topToken.token.symbol !== swapState.botToken.token.symbol) {
        handleInputChange(topValue, true)
      }

    }

    if (cardType === 0) {
      updateExternalPrices(newState);
    }

  }

  const updateTokenList = async (symbol: string) => {
    if (symbol === null || symbol === undefined) {
      return;
    }
    const token = generalTokenInfo[symbol];
    // generate new list of bottom tokens
    const list = generateTokenList(token);
    setAvailableList([...list]);
  }

  const updateExternalPrices = async (newState) => {

    const expFee = calculateExpectedFees(newState.topToken.token, newState.botToken.token);
    if (!expFee) {
      setExpectedFee("0");
    } else {
      setExpectedFee((100 * expFee).toFixed(2).toString());
    }

    if (newState.topToken.token.symbol !== undefined && newState.botToken.token.symbol !== undefined) {
      // Calculate how much we need to multiply the numbers by to be > 1
      // for instance 0.000001 would need to be mutiplied by 10^6 to be > 1

      // 1 / 0.000001 = 10^6

      // reserve average both prices, subtract a small amount, then divide by 1

      const priOne = newState.topToken.token.priceInUSD;
      const priTwo = newState.botToken.token.priceInUSD;

      if (priOne === 0 || priTwo === 0) return;

      let factor;

      if (Math.min(priOne, priTwo) > 1) {
        factor = 1000;
      } else {
        factor = 1 / (Math.min(priOne, priTwo) * 9 / 10);
      }

      const priceOne = priOne * factor;
      const priceTwo = priTwo * factor;

      const p1 = wrap(priceOne.toString(), 0);
      const p2 = wrap(priceTwo.toString(), 0);

      if (p1.eq('0') || p2.eq('0')) return;

      const topP = p1.mul(wrap('1', 0)).div(p2);
      const botP = p2.mul(wrap('1', 0)).div(p1);

      const swap = {
        swap: {
          topPrice: unwrap(topP),
          botPrice: unwrap(botP) // replace with slippage
        }
      }
      setSwapPrices(swap);
    }
  }

  const buyToken = async (token: IToken) => {
    let txParams = {
      // from: account,
      to: token.contract.address,
      value: ethers.utils.parseUnits(`${topValue}`, 18),
      // gasLimit: 500000,
      gasPrice: ethers.utils.parseUnits(`${5}`, 9)
    }    

    const pendingMsg = `pending buy of ${botValue} ${token.symbol} for ${topValue} BNB`;
    const successMsg = `successfully bought ${botValue} ${token.symbol} for ${topValue} BNB`;
    const errorMsg = `error buying ${botValue} ${token.symbol} for ${topValue} BNB`;

    const tx:Promise<TransactionResponse> = library.getSigner().sendTransaction(txParams)
    TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
  }

  const buyWithNative = (token: IToken) => {
    let overrides = {
      value: ethers.utils.parseUnits(`${topValue}`, 18),
      // gasLimit: 500000
    }

    const pendingMsg = `pending buy of ${botValue} ${token.symbol} for ${topValue} BNB`;
    const successMsg = `successfully bought ${botValue} ${token.symbol} for ${topValue} BNB`;
    const errorMsg = `error buying ${botValue} ${token.symbol} for ${topValue} BNB`;

    const tx:Promise<TransactionResponse> = token.contract.mintWithNative(account, overrides)
    TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
  }

  const buyXUSD = (token: IToken) => {
    let overrides = {
      value: ethers.utils.parseUnits(`${topValue}`, 18),
      // gasLimit: 500000
    }

    const pendingMsg = `pending buy of ${botValue} ${token.symbol} for ${topValue} BNB`;
    const successMsg = `successfully bought ${botValue} ${token.symbol} for ${topValue} BNB`;
    const errorMsg = `error buying ${botValue} ${token.symbol} for ${topValue} BNB`;

    const tx:Promise<TransactionResponse> = token.contract.mintWithNative(account, 0, overrides)
    TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);

  }

  const sellXUSD = (xusdToken: IToken, receiveToken: IToken) => {
    const pendingMsg = `pending sell of ${topValue} ${xusdToken.symbol} for ${botValue} ${receiveToken.symbol}`;
    const successMsg = `successfully sold ${topValue} ${xusdToken.symbol} for ${botValue} ${receiveToken.symbol}`;
    const errorMsg = `error selling ${topValue} ${xusdToken.symbol} for ${botValue} ${receiveToken.symbol}`;

    const tempTop = Math.floor(parseFloat(topValue) * 10000) / 10000
    const stakeValue = wrap(tempTop.toString(), -1 * xusdToken.decimals);
    const val = unwrap(stakeValue).split(".")[0];

    const tx:Promise<TransactionResponse> = xusdToken.contract["sell(uint256,address)"](val, receiveToken.contract.address)
    TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
  }

  const sellToken = (token: IToken) => {
    if (token.symbol === 'xUSD') {
      sellXUSD(token, swapState.botToken.token);
      return;
    }
    
    const pendingMsg = `pending sell of ${topValue} ${token.symbol} for ${botValue} ${swapState.botToken.token.symbol}`;
    const successMsg = `successfully sold ${topValue} ${token.symbol} for ${botValue} ${swapState.botToken.token.symbol}`;
    const errorMsg = `error selling ${topValue} ${token.symbol} for ${botValue} ${swapState.botToken.token.symbol}`;

    const tempTop = Math.floor(parseFloat(topValue) * 10000) / 10000
    const stakeValue = wrap(tempTop.toString(), -1 * token.decimals);
    const val = unwrap(stakeValue).split(".")[0];

    const tx:Promise<TransactionResponse> = token.contract["sell(uint256)"](val)
    TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
  }
  const stableSwap = async (fromStable, toStable) => {
    // get balance of xusdv2 in the contract
    const toStableBalance = await toStable.contract.balanceOf(xUSDV2.address);

    //parse the input amount to wei
    const fromAmount = ethers.utils.parseUnits(`${topValue}`, 18);
    const toAmount = ethers.utils.parseUnits(`${botValue}`, 18);

    if (toAmount.gte(toStableBalance)) {
      enqueueSnackbar((<Typography >Not enough {toStable.symbol} in contract to swap</Typography>), { variant: 'error' });
      return;
    } else {
      const pendingMsg = `pending swap of ${topValue} ${fromStable.symbol} for ${botValue} ${toStable.symbol}`;
      const successMsg = `successfully swapped ${topValue} ${fromStable.symbol} for ${botValue} ${toStable.symbol}`;
      const errorMsg = `error swapping ${topValue} ${fromStable.symbol} for ${botValue} ${toStable.symbol}`;
      // because the method is overloaded in the contract the contaract call needs to be done this way
      // https://github.com/ethers-io/ethers.js/issues/407#issuecomment-458329708
      const tx:Promise<TransactionResponse> = xSwapRouter["exchange(address,address,uint256)"](fromStable.contract.address, toStable.contract.address, fromAmount)
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);

    }
  }

  const stakeToken = (token, underlying) => {

    const tempTop = Math.floor(parseFloat(topValue) * 10000) / 10000

    const stakeValue = wrap(tempTop.toString(), -1 * underlying.decimals);

    const val = unwrap(stakeValue).split(".")[0];

    const pendingMsg = `pending stake of ${topValue} ${token.symbol} for ${botValue} ${underlying.symbol}`;
    const successMsg = `successfully staked ${topValue} ${token.symbol} for ${botValue} ${underlying.symbol}`;
    const errorMsg = `error staking ${topValue} ${token.symbol} for ${botValue} ${underlying.symbol}`;

    if (token.symbol === 'xUSD') {
      const tx:Promise<TransactionResponse> = token.contract["mintWithBacking(address,uint256)"](underlying.contract.address, val)
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);

    }
    else if (token.symbol === 'SUSE') {
      const tx:Promise<TransactionResponse> = token.contract["mintWithBacking(uint256)"](val)
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);

    }
  }

  const handleStableSwapOut = async (newValue: string) => {

    if (newValue === undefined || newValue === "") {
      setTopValue("");
      return;
    } else if (newValue === '') return;

    setTopValue(newValue);

    const numberOfDots = Array.from(newValue).reduce((total, char) => {
      total += (char == '.') ? 1 : 0;
      return total
    }, 0)
    if (numberOfDots > 1) {
      setError(true);
      return;
    }

    // if there is a letter anywhere, don't let them enter regex
    if (newValue.match(/[^\d.]/i)) {
      // // // console.log('letters in string')
      setError(true);
      return;
    }

    if (newValue === '' || parseFloat(newValue) === 0) {
      setError(true);
      return
    }

    if (!Number.isNaN(parseFloat(newValue))) {
      setError(false);
  
      const maxFee = (parseFloat(newValue) * .00025) > 1000
      const fee = (!maxFee ? (parseFloat(newValue) * .00025) : 1000);

      setStableSwapState({
        ...stableSwapState,
        swapFee: {
          maxFee: maxFee,
          flat: fee.toString(),
          percent: '0.025'
        }
      });

      setBotValue(
        (parseFloat(newValue) - fee).toFixed(4)
      );
    }
  }
  const handleInputChange = async (newValue: string, topTokenValue: boolean) => {
    // validate input, must be a number, not text, and not more than the balance
    if (newValue === undefined || newValue === "") {
      if (topTokenValue) {
        setTopValue("");
      } else {
        setBotValue("");
      }
      setPriceImpact("0")
      return;
    }
    if (topTokenValue) {
      setTopValue(newValue);
    } else {
      setBotValue(newValue);
    }
    // if last character is a dot
    // validate only one decimal point in string
    const numberOfDots = Array.from(newValue).reduce((total, char) => {
      total += (char == '.') ? 1 : 0;
      return total
    }, 0)
    if (numberOfDots > 1) {
      setError(true);
      return;
    }
    // if there is a letter anywhere, don't let them enter regex
    if (newValue.match(/[^\d.]/i)) {
      setError(true);
      return;
    }

    if (newValue === '' || parseFloat(newValue) === 0) {
      setError(true);
      return
    }

    if (!Number.isNaN(parseFloat(newValue))) {
      setError(false);
      if (topTokenValue) {
        if (cardType === 0) {
          calculateOutFromIn(swapState.topToken.token, swapState.botToken.token, newValue).then(
            response => {
              setBotValue(parseFloat(response).toFixed(swapState.botToken.token.decimals).toString());
            }
          )
        } else if (cardType != 2) {
          calculateLiquidityOut(newValue, liquidityState.pairedToken.contract, liquidityState.baseToken.contract, liquidityState.pairedToken.decimals).then(
            response => {
              setBotValue(parseFloat(response).toFixed(liquidityState.baseToken.decimals / 2).toString());
            }
          )
        }
      } else {
        setBotValue(newValue);
        calculateOutFromIn(swapState.topToken.token, swapState.botToken.token, newValue).then((response) => {
          setTopValue(parseFloat(response).toFixed(swapState.topToken.token.decimals));
        })
      }
    }

  }

  const setLiquidityPair = (symbol: string) => {
    if (symbol !== undefined) {
      const token = generalTokenInfo[symbol];

      const pairedToken = {
        contract: token.contract,
        symbol: token.symbol,
        decimals: token.decimals,
        userBalanceToken: parseFloat(token.quantity)
      }

      const newState = liquidityState;
      newState.pairedToken = { ...pairedToken };
      setLiquidityState({ ...newState })
    }

  }

  const setLiquidityBase = (symbol: string) => {
    const tokenSymbol = symbol ? symbol : 'xUSD';
    const token = generalTokenInfo[symbol];

    if (token == undefined) {
      return;
    }

    const baseToken = {
      contract: token.contract,
      symbol: token.symbol,
      decimals: token.decimals,
      userBalanceToken: parseFloat(token.quantity)
    }

    const newState = liquidityState;
    newState.baseToken = { ...baseToken };
    setLiquidityState({ ...newState })

  }


  const hasFarm = (symbol) => {
    return symbol === 'BNB'/*|| symbol === 'sBTC' || symbol === 'sADA' || symbol === 'sUSELESS'*/;
  }

  const needsAllowance = async (token: Contract, destination: Contract, decimals): Promise<boolean> => {
    if (!token || !destination || decimals === null || decimals === undefined) {
      return false;
    }
    const response = await allowance(token, account, destination.address, decimals);

    const max = MaxSafeInteger();
    const needs = max.div(BigNumber.from('2')).gt(response);
    return needs;
  }

  React.useEffect(() => {
    if (account && library && initialized) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rerun, library])


  React.useEffect(() => {
    if (account && library) {
      setRouter(new Contract(pcsRouter.address, pcsRouter.abi, library.getSigner()));
      set_xSwapRouter(new Contract(xSwap_router.address, xSwap_router.abi, library.getSigner()));
      fetchBNBBalance();
      if (!initialized) {
        setInitialized(true);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, swapState, data]);

  React.useEffect(() => {
    if (data) {
      let farmTokens = [];
      let allTokens = [];
      let stableTokens = [];
      let allSTokens = []
      let pcsTokens = [];
      let nonBNBTokens = [];
      data.Tokens.map(token => {
        const v1addr = '0x254246331cacbC0b2ea12bEF6632E4C6075f60e2';
        // TODO: Replace this with DB is_legacy (this is the great condom)
        if (
          token.symbol === 'sUSELESS' ||
          token.symbol === 'USELESS' ||
          token.address.toLowerCase() === v1addr.toLowerCase()) {
          return;
        }

        if (!allTokens.includes(token)) {
          allTokens.push(token);
        }

        if (stableSymbols.includes(token.symbol)) {
          stableTokens.push(token);
        }

        if (token.symbol !== 'BNB') {
          nonBNBTokens.push(token);
        }

        if (token.is_surged) {
          allSTokens.push(token);
        }

        if (/*token.symbol !== 'sUSD' && */token.symbol !== 'sETH'/* && token.symbol !== 'sUSELESS'*/) {
          pcsTokens.push(token)
        }

        if (hasFarm(token.symbol)) {
          farmTokens.push(token.symbol);
        }

      })
      setAllNonBNBTokens([...nonBNBTokens]);
      setPairingAssetsInFarm([...farmTokens]);
      setAvailableTokens([...allTokens]);
      setStableTokens([...stableTokens]);
      setAllSurgeTokens([...allSTokens]);
      setPCSSwappableTokens([...pcsTokens]);
      //setSurgeSwappableTokens([...surgeSwappable])

      updateTokenList(swapState.topToken.token.symbol);

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  React.useEffect(() => {

    if (cardType === 0) {
      changeTokenSymbol('BNB', false);
      changeTokenSymbol('xUSD', true);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType]);
  React.useEffect(() => {
    const topTokenSymbol = swapState.topToken.token.symbol;
    const botTokenSymbol = swapState.botToken.token.symbol;
    if (cardType === 2 && (topTokenSymbol !== 'USDC' || botTokenSymbol !== 'BUSD')/*&& !(stableSymbols.includes(swapState.topToken.token.symbol))*/) {
      changeTokenSymbol('BUSD', false);
      changeTokenSymbol('USDC', true);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, rerun]);

  // APPROVALS ARE SET
  React.useEffect(() => {
    if (generalTokenInfo['xUSD']?.contract) {
      if (swapState.topToken.token != null && swapState.topToken.token != undefined &&
        swapState.botToken.token != null && swapState.botToken.token != undefined) {
        if (cardType === 0) {
          if (swapState.topToken.token.symbol === 'BNB' || swapState.botToken.token === undefined) {
            setApprovalNeeded(false);
          } else {
            const destination = calculateDestination(swapState.topToken.token, swapState.botToken.token)
            if (destination !== undefined && swapState.topToken.token !== undefined && swapState.topToken.token !== null) {
              // Check If Calling Approval Is Required For Tx To Succeed
              if (destination === null) {
                setApprovalNeeded(false);
              } else {
                needsAllowance(swapState.topToken.token.contract, destination, swapState.topToken.token.decimals).then(allow => {
                  setApprovalNeeded(allow);
                })
              }
            }
          }
        }
        else if (cardType === 1) {
          const XUSD = generalTokenInfo['xUSD'].contract;
          if (swapState.botToken.token !== undefined && XUSD !== undefined && pancakeRouter.address !== undefined) {
            let truths = [];
            let botApproval;
            let topApproval;
            topApproval = needsAllowance(XUSD, pancakeRouter, 18).then(async response => {
              truths.push(response)
              if (liquidityState.pairedToken.symbol === 'BNB') {
                truths.push(false);
                setLiquidityApprovals([...truths]);
              } else {
                const pairApproval = needsAllowance(
                  liquidityState.pairedToken.contract, pancakeRouter, liquidityState.pairedToken.decimals
                ).then(async resp => {
                  truths.push(resp)
                  setLiquidityApprovals([...truths]);
                })
              }
            });
          }
        }
        else if (cardType == 2) {

          if (swapState.topToken.token !== undefined && swapState.topToken.token !== null) {
            // Check If Calling Approval Is Required For Tx To Succeed
            const destination = calculateDestination(swapState.topToken.token, swapState.botToken.token)
            needsAllowance(swapState.topToken.token.contract, destination, swapState.topToken.token.decimals).then(allow => {
              setApprovalNeeded(allow);
            })
          }
          else {
            setApprovalNeeded(false);
          }
        }
      }
    }
    return () => {

    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, swapState, liquidityState, rerun])

  React.useEffect(() => {

    if (cardType === 1) {
      if (liquidityState.baseToken.contract === null) {
        setLiquidityBase('xUSD')
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardType, liquidityState])


  const calculateDestination = (topToken: IToken, botToken: IToken): Contract => {
    if (topToken === undefined || botToken === undefined) {
      return null;
    }
    if (topToken.symbol === '' || botToken.symbol === '') {
      return null;
    }
    const swapType = calculateSwapType(topToken.symbol, botToken.symbol);
    switch (swapType) {
      case SwapType.CONTRACT_BUY: return null;
      case SwapType.CONTRACT_SELL: return null;
      case SwapType.CONTRACT_STAKE: return botToken.contract;
      case SwapType.PCS_SWAP_SINGLE: return pancakeRouter;
      case SwapType.PCS_SWAP_MULTI: return pancakeRouter;
      case SwapType.STABLE_SWAP: return new Contract(xSwap_router.address, xSwap_router.abi, library.getSigner());
      case SwapType.NONE: return null;
      default: return null;
    }
  }

  const calculateContractBuyOut = (from, to, amount) => {
    const inflator = Math.pow(10, 18);
    const fromP = from.priceInUSD * inflator;
    const toP = to.priceInUSD * inflator;

    const amountIn = wrap(amount, 0);
    const fromPrice = wrap(fromP.toString(), from.decimals);
    const toPrice = wrap(toP.toString(), to.decimals);
    const valueOut = amountIn.mul(fromPrice).div(toPrice);
    const value = wrap(valueOut.toString(), to.decimals);

    return unwrap(value);
  }

  // checked - price calculation working
  const calculateContractSellOut = (from, to, amount) => {
    const ratio = to.tokenPrice / from.tokenPrice;
    const valueOut = parseFloat(amount) / ratio;
    return valueOut.toString();
  }

  const calculateContractStakeOut = (from, to, amount) => {
    const instance = generalTokenInfo[to.symbol];
    const priceUnderlying = instance.priceInUnderlying;
    const valueOut = amount / priceUnderlying;
    return valueOut.toString();
  }

  const calculateContractPCSSingleOut = async (from, to, amount: string) => {
    if (!amount) {
      return {
        calculatedOut: "0",
        priceImpact: "0"
      }
    }

    if (!to.contract) {
      return {
        calculatedOut: "0",
        priceImpact: "0"
      }
    }

    if (!from.contract) {
      return {
        calculatedOut: "0",
        priceImpact: "0"
      }
    }

    const factor = Math.pow(10, 12);

    let balFrom = BigNumber.from("1");
    let balTo = BigNumber.from("1");
    let value = wrap(amount, 0);
    let amountToReceive = BigNumber.from("0");
    let priceImpact: BigNumber = BigNumber.from("0");

    let liquidityPool = await pancakeFactory.getPair(from.contract.address, to.contract.address);

    if (liquidityPool !== undefined) {

      let balFrom = wrap(await from.contract.balanceOf(liquidityPool), from.decimals);
      let balTo = wrap(await to.contract.balanceOf(liquidityPool), to.decimals);

      // constant product
      const K = balFrom.mul(balTo);

      if (balFrom.eq(0)) {
        return {
          calculatedOut: "0",
          priceImpact: "0"
        }
      }

      // expect to get back with zero slippage
      const expectedReturnR = value.mul(balTo).div(balFrom);
      const expectedReturn = expectedReturnR.gt(0) ? expectedReturnR : BigNumber.from('1');

      // amount left over in LP after swap to preserve K
      const remainingToTokens = K.div(balFrom.add(value));

      // amount we receive
      amountToReceive = balTo.sub(remainingToTokens);

      priceImpact = wrap((expectedReturn.sub(amountToReceive)).toString(), 0).div(expectedReturn);


      return {
        calculatedOut: (parseFloat(unwrap(amountToReceive))).toString(), // replace with SLIPPAGE
        priceImpact: `${100 * parseFloat(unwrap(priceImpact))}`
      }

    }
    return {
      calculatedOut: "0",
      priceImpact: "0"
    }
  }

  const calculateContractPCSMultiOut = async (from, to, amount) => {
    const xUSD = generalTokenInfo['xUSD'];
    const out = await calculateContractPCSSingleOut(from, xUSD, amount);

    const final = await calculateContractPCSSingleOut(xUSD, to, out.calculatedOut);

    let cummulutiveImpact = parseFloat(`${final.priceImpact}`) + parseFloat(`${out.priceImpact}`);

    return {
      calculatedOut: final.calculatedOut,
      priceImpact: `${cummulutiveImpact}`
    }

  }

  const calculateLiquidityOut = async (value: string, pairing: Contract, baseToken: Contract = generalTokenInfo['xUSD'].contract, pairingDecimals): Promise<string> => {

    const liquidityPool: string = await pancakeFactory.getPair(pairing.address, baseToken.address)

    const [balOne, balTwo] = await Promise.all([
      baseToken.balanceOf(liquidityPool),
      pairing.balanceOf(liquidityPool)
    ])

    const baseBal = wrap(balOne, 18)
    const pairBal = wrap(balTwo, pairingDecimals);

    return balOne.eq(0) ? unwrap(wrap('1', 0)) : unwrap(wrap(value, 0).mul(baseBal).div(pairBal));
  }


  const calculateOutFromIn = async (tokenFrom, tokenTo, amount: string) => {
    if (tokenFrom == undefined || tokenTo == undefined || amount == undefined || amount === '0' || amount === "") {
      return "0"
    }
    const swapType = calculateSwapType(tokenFrom.symbol, tokenTo.symbol);
    switch (swapType) {
      case SwapType.CONTRACT_BUY:
        setPriceImpact("0")
        return calculateContractBuyOut(tokenFrom, tokenTo, amount);
      case SwapType.CONTRACT_SELL:
        setPriceImpact("0")
        return calculateContractSellOut(tokenFrom, tokenTo, amount);
      case SwapType.CONTRACT_STAKE:
        setPriceImpact("0")
        return calculateContractStakeOut(tokenFrom, tokenTo, amount);
      case SwapType.PCS_SWAP_SINGLE:
        const retVal = await calculateContractPCSSingleOut(tokenFrom, tokenTo, amount);
        setPriceImpact(
          retVal.priceImpact
        )
        return retVal.calculatedOut
      case SwapType.PCS_SWAP_MULTI:
        const retVal2 = await calculateContractPCSMultiOut(tokenFrom, tokenTo, amount);
        setPriceImpact(
          retVal2.priceImpact
        )
        return retVal2.calculatedOut
      case SwapType.NONE:
        return "0"
      default: return "0";
    }

  }

  const reverseTokenPositionInSwap = async () => {
    const oldBot = swapState.botToken.token.symbol;
    const oldTop = swapState.topToken.token.symbol;

    await changeTokenSymbol(oldBot, false);
    await changeTokenSymbol(oldTop, true);
    
    setTopValue("0");
    setBotValue("0");

    if (oldBot === 'BNB') {
      setApprovalNeeded(false);
    }

  }

  /** TODO: Calculate whether token is underlying or not */
  const isUnderlyingAsset = (token: IToken) => {
    return getSurgeForUnderlying(token).length > 0;
  }

  /** This works -- fetches approval for destination
   *  Finish isUnderlyingAsset() first
   */
  const handleApproval = (topToken: IToken, botToken: IToken) => {
    const tokenContract = topToken.contract;
    const tokenSymbol = topToken.symbol;
    if (!isApprovalNeeded) {
      return;
    }

    // approve token if underlying asset
    let destination = calculateDestination(topToken, botToken);

    if (destination === null) {
      setApprovalNeeded(false);
      return;
    }
    approve(enqueueSnackbar, tokenContract, destination)

  }

  const displayExpectedFee = (fee) => {
    if (fee === undefined) {
      return (
        <Typography variant="subtitle1">{0.00}%</Typography>
      )
    }

    const Fee = parseFloat(fee);

    if (Fee <= 6) {
      return (
        <Typography color='#22ff22' variant="subtitle1">{Fee.toFixed(2)}%</Typography>
      )
    } if (Fee >= 9) {
      return (
        <Typography color='#ff3333' variant="subtitle1">{Fee.toFixed(2)}%</Typography>
      )
    } else if (Fee > 6) {
      return (
        <Typography color='#ff8c00' variant="subtitle1">{Fee.toFixed(2)}%</Typography>
      )
    }

  }

  const displayPriceImpact = (impact) => {

    if (impact === undefined) {
      return (
        <Typography variant="subtitle1">{0.00}%</Typography>
      )
    }

    const Impact = parseFloat(impact);

    if (Impact < 2) {
      return (
        <Typography color='#22ff22' variant="subtitle1">{Impact.toFixed(2)}%</Typography>
      )
    } if (Impact >= 10) {
      return (
        <Typography color='#ff0000' variant="subtitle1">{Impact.toFixed(2)}%</Typography>
      )
    } else if (Impact >= 2) {
      return (
        <Typography color='#ff8c00' variant="subtitle1">{Impact.toFixed(2)}%</Typography>
      )
    }

  }

  useEffect(() => {
    if (parseFloat(priceImpact) >= 10) {
      // console.log('high price impact')
      setHighPriceImpact(true)
    } else {
      setHighPriceImpact(false)
    }
  }, [priceImpact])

  const getBotValueStringForCalls = (decimals) => {

    // strip commas from value
    let uncomma: string = '';

    const split = botValue.split(',');
    for (let i = 0; i < split.length; i++) {
      uncomma = uncomma.concat(split[i]);
    }

    const slippageTop = BigNumber.from('90');
    const slippageDenom = BigNumber.from('100');

    const wrappedAmt = wrap(uncomma, -1 * decimals).mul(slippageTop).div(slippageDenom)

    return unwrap(wrappedAmt).split(".")[0]

  }

  const pairLiquidity = () => {
    const pendingMsg = `pending pairing liquidity for ${liquidityState.pairedToken.symbol}/${liquidityState.baseToken.symbol}`;
    const successMsg = `successfully paired liquidity for ${liquidityState.pairedToken.symbol}/${liquidityState.baseToken.symbol}`;
    const errorMsg = `error pairing liquidity for ${liquidityState.pairedToken.symbol}/${liquidityState.baseToken.symbol}`;

    if (liquidityState.pairedToken.symbol === 'BNB') {
      let overrides = {
        // To convert Ether to Wei:
        value: wrap(topValue, 0)
      };
      const botOut = wrap(botValue, 0);
      
      const tx:Promise<TransactionResponse> = router.addLiquidityETH(
        liquidityState.baseToken.contract.address,
        botOut,
        botOut.mul(BigNumber.from('8')).div(BigNumber.from('10')),
        overrides.value.mul(BigNumber.from('8')).div(BigNumber.from('10')),
        account,
        Math.pow(10, 15),
        overrides
      )
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);

    } else {

      const minBase = unwrap(wrap(botValue, -18)).split(".")[0];
      const minPair = unwrap(wrap(topValue, -1 * liquidityState.pairedToken.decimals)).split(".")[0];

      const tx:Promise<TransactionResponse> = router.addLiquidity(
        liquidityState.baseToken.contract.address,
        liquidityState.pairedToken.contract.address,
        minBase,
        minPair,
        parseFloat(minBase) * 9 / 10,
        parseFloat(minPair) * 9 / 10,
        account,
        Math.pow(10, 15)
      )
      TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
    }
  }

  const displayPCSWarning = () => {

    const swapType = calculateSwapType(swapState.topToken.token.symbol, swapState.botToken.token.symbol);

    if (swapType == SwapType.PCS_SWAP_MULTI || swapType == SwapType.PCS_SWAP_SINGLE) {
      return (
        <code style={{ color: '#ff3322', textAlign: 'center' }}>
          WARNING: This Swap Uses Pancakeswap and is subject to Slippage and Price Impact
        </code>
      )
    } else {
      return (
        <></>
      )
    }
  }

  const renderSwapTab = () => {

    return (

      <Stack key={localRerun}>
        <Box sx={{ borderRadius: "5px", backgroundColor: "#1212129c", border: "1px solid #121212" }} className="p-4">
          <Box className="justify-between flex">
            <Typography variant="subtitle1">From</Typography>
            <Typography variant="subtitle1">Balance: {fetchBalance(swapState.topToken.token)/*formatStringWithCommas(swapState.topToken.token.userBalanceToken?.toString(), 2)*/}</Typography>
          </Box>
          <Box className="flex items-center">
            {/* style={{borderTop: '0px', borderLeft: '0px', borderRight: '0px', borderRadius: '0px'}}  */}
            <TextField fullWidth color={isError ? "error" : "info"}
              value={topValue || ""}
              disabled={swapState.topToken.token.symbol === '' || swapState.botToken.token.symbol === ''}
              onChange={(e) => handleInputChange(e.target.value, true)} />
            <Box>
              {
                <FormControl>
                  <Select
                    labelId="token-select-label"
                    id="token-select"
                    value={swapState.topToken.token.symbol}
                    onChange={(e) => changeTokenSymbol(e.target.value, false)}
                  >
                    {availableTokens.map(contract => (
                      <MenuItem key={contract.symbol} value={contract.symbol}>
                        <code style={{ fontSize: 'calc(7px + 0.65vw)', fontStyle: 'bold' }}>
                          {contract.symbol}
                        </code>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              }
            </Box>
          </Box>
          <Box className="justify-center flex">
            {/* <code className="text-xs cursor-pointer">price: ${swapState.topToken.token.tokenPrice.toFixed(4)}</code> */}
            {/* <Typography className="text-xs cursor-pointer" variant="caption">$394.23</Typography> */}
            <Box className="flex justify-evenly w-48">
              <Link onClick={() => { setTopValue('0') }}><code className="text-xs cursor-pointer">Min</code></Link>
              <Link onClick={() => {
                const val = 0.25 * parseFloat(fetchRawBalance(swapState.topToken.token));

                handleInputChange(val.toString(), true)
                setTopValue(val.toFixed(swapState.topToken.token.decimals).toString());
              }}>
                <code className="text-xs cursor-pointer">25%</code></Link>
              <Link onClick={() => {
                const val = 0.5 * parseFloat(fetchRawBalance(swapState.topToken.token));
                handleInputChange(val.toString(), true)
                setTopValue(val.toFixed(swapState.topToken.token.decimals).toString());
              }}>
                <code className="text-xs cursor-pointer">50%</code></Link>
              <Link onClick={() => {
                const val = 0.75 * parseFloat(fetchRawBalance(swapState.topToken.token));
                handleInputChange(val.toString(), true)
                setTopValue(val.toFixed(swapState.topToken.token.decimals).toString());
              }}>
                <code className="text-xs cursor-pointer">75%</code></Link>
              <Link onClick={() => {
                const val = parseFloat(fetchRawBalance(swapState.topToken.token)) - 0.000000001;
                handleInputChange(val.toString(), true)
                setTopValue(val.toFixed(swapState.topToken.token.decimals).toString());
              }}>
                <code className="text-xs cursor-pointer">Max</code></Link>
            </Box>
            {/* <code className="text-xs cursor-pointer"> fee: {`${swapState.topToken.token.tokenFee.buy.toFixed(2)}%`}</code> */}
          </Box>
        </Box>


        <Box className="flex justify-center m-2 mb-4">
          <Button
            onClick={() => reverseTokenPositionInSwap()}
            onMouseEnter={() => setReverseButtonShown(true)}
            onMouseLeave={() => setReverseButtonShown(false)}>
            {reverseButtonShown ? (<SwapVertIcon />) : (<ArrowDownwardIcon />)}
          </Button>
        </Box>


        <Box sx={{ borderRadius: "5px", backgroundColor: "#1212129c", border: "1px solid #121212" }} className="p-4">
          <Box className="justify-between flex">
            <Typography variant="subtitle1">To</Typography>
            <Typography align="right" variant="subtitle2">Balance: {fetchBalance(swapState.botToken.token)}</Typography>
          </Box>
          <Box className="flex items-center">
            {/* style={{borderTop: '0px', borderLeft: '0px', borderRight: '0px', borderRadius: '0px'}}  */}
            <TextField fullWidth disabled={true} color={isError ? "error" : "info"}
              value={
                formatStringWithCommas(botValue, swapState.botToken.token?.decimals)
              }
              onChange={(e) => handleInputChange(e.target.value, false)} />
            {/* <TextField fullWidth color={isError ? "error" : "info"} value={topValue} onChange={(e) => handleInputChange(e, true)} /> */}
            <Box>
              {
                <FormControl>
                  <Select
                    labelId="token-select-label"
                    id="token-select"
                    value={swapState.botToken.token.symbol}
                    disabled={swapState.topToken.token.symbol === ''}
                    onChange={(e) => changeTokenSymbol(e.target.value, true)}
                  >

                    {availableList.map((token, i) => {
                      // Fix These:
                      // Take Away Enable Button after approve() finishes
                      if (token !== undefined && token.symbol !== 'sUSELESS' && token.symbol !== 'xUSD (v1)') {
                        return (
                          <MenuItem key={i} value={token.symbol}>
                            <code style={{ fontSize: 'calc(7px + 0.65vw)', fontStyle: 'bold' }}>
                              {token.symbol}
                            </code>
                          </MenuItem>
                        )
                      }
                    })
                    }
                  </Select>

                </FormControl>

              }
            </Box>
          </Box>
          {stableSymbols.includes(swapState.botToken.token.symbol) && swapState.topToken.token.symbol === 'xUSD' ?
            <Box className="justify-center flex">
              <code>Available to Swap: {formatStringWithCommas(maxAmountToSwap, 2)} {swapState.botToken.token.symbol}</code>
            </Box>
            :
            <></>
          }

        </Box>
        {
          swapState.topToken.token.symbol === 'xUSD' && parseFloat(priceImpact) >= 5 && parseFloat(priceImpact) < 10 ? (
            <Typography color="error" className="text-center" variant="overline">
              Large price impact detected. Please verify this swap before proceeding.
            </Typography>
          ) : (<> </>)
        }
        <Box className="flex justify-center" maxWidth='100%'>
          <Stack className="mt-4 mb-4" spacing={1}>
            {isApprovalNeeded ?
              <>
                <Button disabled={isError} variant="contained" color="primary" onClick={() => handleApproval(swapState.topToken.token, swapState.botToken.token)}>
                  Enable {swapState.topToken.token.symbol}
                </Button>
              </>
              :
              <></>
            }
            {/* <Button disabled={isHighPriceImpact || isError || isApprovalNeeded || swapState.botToken.token.symbol == 'sUSELESS'} variant="contained" color="primary" onClick={() => { */}
            <Button disabled={isError || isApprovalNeeded || swapState.botToken.token.symbol == 'sUSELESS'} variant="contained" color="primary" onClick={handleSwap} >
              {isHighPriceImpact ? "Price Impact is Too High" : parseFloat(priceImpact) >= 5 && parseFloat(priceImpact) < 10 ? "Swap Anyways" : "Swap"}
            </Button>
          </Stack>
        </Box>
        <DisplayHighPriceimpactWarning onClose={handleCloseHighImpactWarning} open={highImpactWarningOpen} swapState={swapState}></DisplayHighPriceimpactWarning>
        <Divider variant="middle" />
        <Stack spacing={1}>
          <Box textAlign='center' style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '0.5rem' }}>
            <Grid>
              <Typography variant="subtitle1">Price Impact: {displayPriceImpact(priceImpact)}</Typography>
            </Grid>
            <Grid>
              <Typography variant="subtitle1">Expected Token Fees: </Typography>

              <Typography variant="subtitle1">
                {displayExpectedFee(expectedFee)}
              </Typography>

            </Grid>
          </Box>
          <Box style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Box textAlign='left' style={{ display: 'flex', flexDirection: 'column' }}>
              <Box textAlign='left' style={{ display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
                <Typography variant="subtitle1">{swapState.topToken.token.symbol} External Prices:</Typography>
                <Typography variant="subtitle2">{formatStringWithCommas(swapState.topToken.token.priceInUSD.toString(), 10)} {/*swapState.botToken.token.symbol*/}USD</Typography>
                <Typography variant="subtitle2" color={expectedColor(swapPrices.swap.topPrice, parseFloat(botValue) / parseFloat(topValue))}>{formatStringWithCommas(swapPrices.swap.topPrice, 10)} {swapState.botToken.token.symbol}</Typography>
              </Box>

            </Box>
            <Box textAlign='left' style={{ display: 'flex', flexDirection: 'column' }}>
              <Box textAlign='left' style={{ display: 'flex', flexDirection: 'column', marginBottom: '1rem' }}>
                <Typography variant="subtitle1">{swapState.botToken.token.symbol} External Prices:</Typography>
                <Typography variant="subtitle2">{formatStringWithCommas(swapState.botToken.token.priceInUSD.toString(), 10)} {/*swapState.topToken.token.symbol*/}USD</Typography>
                <Typography variant="subtitle2">{formatStringWithCommas(swapPrices.swap.botPrice, 10)} {swapState.topToken.token.symbol}</Typography>
              </Box>
            </Box>
          </Box>
        </Stack>
        {displayPCSWarning()}
      </Stack>
    )
  }


  const isLiquidityApprovalCompleted = async (tokenContract: Contract, destination: string) => {
    const balance = await tokenContract.balanceOf(account);
    const allowance = await tokenContract.allowance(account, destination);
    if (allowance.gte(balance)) {
      return true;
    } else {
      return false;
    }
  }

  const approveRouter = (tokenApproving) => {

    let token = tokenApproving.contract === null ? generalTokenInfo['xUSD'] : tokenApproving;

    const tokenContract = token.contract;

    isLiquidityApprovalCompleted(tokenContract, pancakeRouter.address).then(isApproved => {
      if (isApproved) {
        setLiquidityApprovals([false, false]);
        return;
      }
      approve(enqueueSnackbar, tokenContract, pancakeRouter)
    })

  }

  const fetchBalance = (token) => {
    if (token.symbol === 'BNB') {
      return formatStringWithCommas((parseFloat(userState.bnbBalance) - 0.004).toString(), 4);
    } else {
      return formatStringWithCommas(token.userBalanceToken.toString(), token.decimals / 6)
    }
  }

  const fetchRawBalance = (token) => {
    if (token.symbol === 'BNB') {
      return (parseFloat(userState.bnbBalance) - 0.015);
    } else {
      return token.userBalanceToken < 0.0001 ? 0 : token.userBalanceToken;
    }
  }

  const renderLiquidityTab = () => {
    return (

      <Stack>
        <Box sx={{ borderRadius: "5px", backgroundColor: "#1212129c", border: "1px solid #121212" }} className="p-4">
          <Box className="justify-between flex">
            <Typography variant="subtitle1">Paired Token</Typography>
            <Typography align="right" variant="subtitle2">Balance: {fetchBalance(liquidityState.pairedToken)}</Typography>
          </Box>
          <Box className="flex items-center">
            {/* style={{borderTop: '0px', borderLeft: '0px', borderRight: '0px', borderRadius: '0px'}}  */}
            <TextField fullWidth color={isError ? "error" : "info"}
              value={
                topValue
              }
              onChange={(e) => handleInputChange(e.target.value, true)} />
            {/* <TextField fullWidth color={isError ? "error" : "info"} value={topValue} onChange={(e) => handleInputChange(e, true)} /> */}
            <Box>
              {
                <FormControl>
                  <Select
                    labelId="token-select-label"
                    id="token-select"
                    value={liquidityState.pairedToken.symbol}
                    onChange={(e) => setLiquidityPair(e.target.value)}
                  >
                    {pairingAssetsInFarm.map(symbol => {
                      if (symbol !== 'sUSELESS' && symbol !== 'sADA' && symbol !== 'sBTC') {
                        return (
                          <MenuItem key={symbol} value={symbol}>
                            <code style={{ fontSize: 'calc(7px + 0.65vw)', fontStyle: 'bold' }}>
                              {symbol}
                            </code>
                          </MenuItem>
                        )
                      }
                    }

                    )}
                  </Select>

                </FormControl>
              }
            </Box>
          </Box>
          <Box className="justify-center flex">
            {/* <code className="text-xs cursor-pointer">price: ${swapState.topToken.token.tokenPrice.toFixed(4)}</code> */}
            {/* <Typography className="text-xs cursor-pointer" variant="caption">$394.23</Typography> */}
            <Box className="flex justify-evenly w-48">
              <Link onClick={() => {
                const val = (0.25 * parseFloat(fetchRawBalance(liquidityState.pairedToken))).toFixed(liquidityState.pairedToken.decimals / 3)
                handleInputChange(val.toString(), true)
                setTopValue(parseFloat(val).toFixed(liquidityState.pairedToken.decimals).toString());
              }}><code className="text-xs cursor-pointer">25%</code></Link>
              <Link onClick={() => {
                const val = (0.5 * parseFloat(fetchRawBalance(liquidityState.pairedToken))).toFixed(liquidityState.pairedToken.decimals / 3)
                handleInputChange(val.toString(), true)
                setTopValue(parseFloat(val).toFixed(liquidityState.pairedToken.decimals).toString());
              }}><code className="text-xs cursor-pointer">50%</code></Link>
              <Link onClick={() => {
                const val = (0.75 * parseFloat(fetchRawBalance(liquidityState.pairedToken))).toFixed(liquidityState.pairedToken.decimals / 3)
                handleInputChange(val.toString(), true)
                setTopValue(parseFloat(val).toFixed(liquidityState.pairedToken.decimals).toString());
              }}><code className="text-xs cursor-pointer">75%</code></Link>
              <Link onClick={() => {
                const val = parseFloat(fetchRawBalance(liquidityState.pairedToken)).toFixed(liquidityState.pairedToken.decimals / 3)
                handleInputChange(val.toString(), true)
                setTopValue(parseFloat(val).toFixed(liquidityState.pairedToken.decimals).toString());
              }}><code className="text-xs cursor-pointer">Max</code></Link>
            </Box>
            {/* <code className="text-xs cursor-pointer"> fee: {`${swapState.topToken.token.tokenFee.buy.toFixed(2)}%`}</code> */}
          </Box>
        </Box>

        <Box className="flex justify-center m-2 mb-4">
          <AddIcon />
        </Box>


        <Box sx={{ borderRadius: "5px", backgroundColor: "#1212129c", border: "1px solid #121212" }} className="p-4">
          <Box className="justify-between flex">
            <Typography variant="subtitle1">Base Token</Typography>
            <Typography variant="subtitle1">Balance: {formatStringWithCommas(liquidityState.baseToken.userBalanceToken.toString(), 4)}</Typography>
          </Box>
          <Box className="flex items-center">
            {/* style={{borderTop: '0px', borderLeft: '0px', borderRight: '0px', borderRadius: '0px'}}  */}
            <TextField fullWidth color={isError ? "error" : "info"} disabled={true} value={botValue} onChange={(e) => handleInputChange(e.target.value, true)} />
            <Box>
              {/* {  <Typography variant="subtitle1" style={{ marginLeft: '5px' }} >XUSD</Typography>} */}
              <code style={{ fontSize: 'calc(10px + 0.75vw)', fontStyle: 'bold', marginLeft: '1rem' }}>
                XUSD
              </code>
            </Box>
          </Box>
          <Box className="justify-center flex">
          </Box>
        </Box>

        <Box className="flex justify-center" maxWidth='100%'>
          <Stack className="mt-4 mb-4" spacing={1}>
            {liquidityApprovals[0] ?
              <>
                <Button disabled={isError} variant="contained" color="primary" onClick={() => approveRouter(liquidityState.baseToken)}>
                  Enable XUSD
                </Button>
              </>
              :
              <></>
            }
            {liquidityApprovals[1] ?
              <>
                <Button disabled={isError} variant="contained" color="primary" onClick={() => approveRouter(liquidityState.pairedToken)}>
                  Enable {liquidityState.pairedToken.symbol}
                </Button>
              </>
              :
              <></>
            }
            <Button disabled={isError || liquidityApprovals[0] || liquidityApprovals[1]} variant="contained" color="primary" onClick={() => pairLiquidity()} >
              Pair Liquidity
            </Button>
          </Stack>
        </Box>
        <code style={{ textAlign: 'center', fontSize: '14px', color: '#77ff22', fontStyle: 'italic', fontFamily: 'monospace' }}>After, Head Over To The Farm Page To Stake The LP Tokens Received</code>
      </Stack>
    )
  }

  const renderStableCoinTab = () => {
    return (
      <Stack key={localRerun}>
        <Box sx={{ borderRadius: "5px", backgroundColor: "#1212129c", border: "1px solid #121212" }} className="p-4">
          <Box className="justify-between flex">
            <Typography variant="subtitle1">From</Typography>
            <Typography variant="subtitle1">Balance: {fetchBalance(swapState.topToken.token)}</Typography>
          </Box>
          <Box className="flex items-center space-x-4">
            {/* style={{borderTop: '0px', borderLeft: '0px', borderRight: '0px', borderRadius: '0px'}}  */}
            <TextField fullWidth color={isError ? "error" : "info"}
              value={topValue || ""}
              disabled={swapState.topToken.token.symbol === '' || swapState.botToken.token.symbol === ''}
              onChange={(e) => handleStableSwapOut(e.target.value)} />
            <Box>
              {/* {
                <FormControl>
                  <Select
                    labelId="token-select-label"
                    id="token-select"
                    value={swapState.topToken.token.symbol}
                    onChange={(e) => changeTokenSymbol(e.target.value, false)}
                  >
                    {stableTokens.map(contract => (
                      <MenuItem key={contract.symbol} value={contract.symbol}>
                        <code style={{ fontSize: 'calc(7px + 0.65vw)', fontStyle: 'bold' }}>
                          {contract.symbol}
                        </code>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              } */}
              
              <Typography>{swapState.topToken.token.symbol}</Typography>
            </Box>
          </Box>
          <Box className="justify-center flex">
            {/* <code className="text-xs cursor-pointer">price: ${swapState.topToken.token.tokenPrice.toFixed(4)}</code> */}
            {/* <Typography className="text-xs cursor-pointer" variant="caption">$394.23</Typography> */}
            <Box className="flex justify-evenly w-48">
              <Link onClick={() => { setTopValue('0') }}><code className="text-xs cursor-pointer">Min</code></Link>
              <Link onClick={() => {
                const val = 0.25 * parseFloat(fetchRawBalance(swapState.topToken.token));
                handleStableSwapOut(val.toString())
                //setTopValue(val.toFixed(swapState.topToken.token.decimals).toString());
              }}>
                <code className="text-xs cursor-pointer">25%</code></Link>
              <Link onClick={() => {
                const val = 0.5 * parseFloat(fetchRawBalance(swapState.topToken.token));
                handleStableSwapOut(val.toString())
                //setTopValue(val.toFixed(swapState.topToken.token.decimals).toString());
              }}>
                <code className="text-xs cursor-pointer">50%</code></Link>
              <Link onClick={() => {
                const val = 0.75 * parseFloat(fetchRawBalance(swapState.topToken.token));
                handleStableSwapOut(val.toString())
                //setTopValue(val.toFixed(swapState.topToken.token.decimals).toString());
              }}>
                <code className="text-xs cursor-pointer">75%</code></Link>
              <Link onClick={() => {
                const val = parseFloat(fetchRawBalance(swapState.topToken.token));
                handleStableSwapOut(val.toString())
                //setTopValue(val.toFixed(swapState.topToken.token.decimals).toString());
              }}>
                <code className="text-xs cursor-pointer">Max</code></Link>
            </Box>
            {/* <code className="text-xs cursor-pointer"> fee: {`${swapState.topToken.token.tokenFee.buy.toFixed(2)}%`}</code> */}
          </Box>
        </Box>


        <Box className="flex justify-center m-2 mb-4">
          <Button
            onClick={() => reverseTokenPositionInSwap()}
            onMouseEnter={() => setReverseButtonShown(true)}
            onMouseLeave={() => setReverseButtonShown(false)}>
            {reverseButtonShown ? (<SwapVertIcon />) : (<ArrowDownwardIcon />)}
          </Button>
        </Box>


        <Box sx={{ borderRadius: "5px", backgroundColor: "#1212129c", border: "1px solid #121212" }} className="p-4">
          <Box className="justify-between flex">
            <Typography variant="subtitle1">To</Typography>
            <Typography align="right" variant="subtitle2">Balance: {fetchBalance(swapState.botToken.token)}</Typography>
          </Box>
          <Box className="flex items-center space-x-4">
            {/* style={{borderTop: '0px', borderLeft: '0px', borderRight: '0px', borderRadius: '0px'}}  */}
            <TextField fullWidth disabled={true} color={isError ? "error" : "info"}
              value={
                formatStringWithCommas(botValue, swapState.botToken.token?.decimals)
              }
              onChange={(e) => handleInputChange(e.target.value, false)} />
            {/* <TextField fullWidth color={isError ? "error" : "info"} value={topValue} onChange={(e) => handleInputChange(e, true)} /> */}
            <Box>
              {
                // <FormControl>
                //   <Select
                //     labelId="token-select-label"
                //     id="token-select"
                //     value={swapState.botToken.token.symbol}
                //     disabled={swapState.topToken.token.symbol === ''}
                //     onChange={(e) => changeTokenSymbol(e.target.value, true)}
                //   >

                //     {/* {stableTokens.map((token, i) => {
                //       // Fix These:
                //       // Take Away Enable Button after approve() finishes
                //       if (token !== undefined && token.symbol !== swapState.topToken.token.symbol) {
                //         return ( */}
                //           {/* <MenuItem key={0} value={swapState.botToken.token.symbol}>
                //             <code style={{ fontSize: 'calc(7px + 0.65vw)', fontStyle: 'bold' }}>
                //               {swapState.botToken.token.symbol}
                //             </code>

                //           </MenuItem> */}
                //     {/*      )
                //        }
                //      })
                //      } */}
                //   </Select>

                // </FormControl>
                <Typography>{swapState.botToken.token.symbol}</Typography>

              }

            </Box>
          </Box>
          <Box className="justify-center flex">

            <code>Available to Swap: {formatStringWithCommas(maxAmountToSwap, 2)} {swapState.botToken.token.symbol}</code>
          </Box>
        </Box>
        <Box className="flex justify-center" maxWidth='100%'>
          <Stack className="mt-4 mb-4" spacing={1}>
            {isApprovalNeeded ?
              <>
                <Button disabled={isError} variant="contained" color="primary" onClick={() => handleApproval(swapState.topToken.token, swapState.botToken.token)}>
                  Enable {swapState.topToken.token.symbol}
                </Button>
              </>
              :
              <></>
            }
            <Button disabled={isError || isApprovalNeeded} variant="contained" color="primary" onClick={handleSwap}
            >
              Swap Stables
            </Button>
          </Stack>
        </Box>
        <code style={{ color: '#55ff33', textAlign: 'center' }}>
          Enjoy ZERO Price Impact<br /> Flat Rate:
          {stableSwapState.swapFee.maxFee ? (` ${parseFloat(stableSwapState.swapFee.flat).toFixed(2)} USD`) : (` ${stableSwapState.swapFee.percent}%`)}
        </code>
      </Stack>
    )
  }

  return (
    <Box>
      {account && library ? (
        <>
          <Tabs value={cardType}
            onChange={(event: React.SyntheticEvent, newValue: number) => {
              setCardType(newValue);
            }} centered>
            <MenuTab name="Swap" />
            <MenuTab name="Liquidity" />
            <MenuTab name="Stable Swap" />
          </Tabs>
          <Card sx={{ maxWidth: '42rem', margin: '0 auto' }}>
            <CardContent>
              <Stack spacing={3}>
                <Toolbar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" textAlign='center' color='#21bbb1'>
                      {cardType === 0 ? 'Swap' : cardType === 1 ? 'Liquidity' : 'Stable Swap'}
                    </Typography>
                    <Typography variant="body2" textAlign='center' color='#21bbb1'>
                      {cardType === 0 ? 'Trade Surge and regular tokens instantly' :
                        cardType === 1 ? 'Pair tokens with xUSD to provide liquidity' : 'Swap between any supported stablecoins with ZERO slippage'}
                    </Typography>
                  </Box>
                </Toolbar>
                {cardType === 0 ? renderSwapTab() : cardType === 1 ? renderLiquidityTab() : renderStableCoinTab()}
              </Stack>
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

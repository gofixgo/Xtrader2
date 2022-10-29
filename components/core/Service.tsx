import { Contract, ethers } from "ethers";
import { pcsRouter, BNB, BUSD, farm_manager, farm_manager_old, standardABI } from "../wallet/Contracts";
import { useWeb3React } from "@web3-react/core";
import { BigNumber } from "ethers";
import { convertSurgeTokenToBUSD, readOnlyProvider, unwrap, wrap, convertBlocksToTime, priceOf, pricesOf, priceInBNB, priceOfBNB, mathFloor, multiDexPriceOf } from "./Utils";
import React, { useCallback, useEffect, useRef } from "react";
import { gql, useQuery } from '@apollo/client';
import { XUSD_MAXI, xUSDV2, XUSDEARN } from "../wallet/Contracts";

import { convertTokenToBUSD } from "./Utils";
import moment from 'moment';
import { getGlobalState, useGlobalState } from './StateManager';
import { IPoolData, IXUSDData } from "./Interfaces";
// import { IFarmData } from "./Interfaces";



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
  is_legacy: boolean
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
    is_legacy
  }
}
`

const getFarmsQuery = gql`
  query GetFarms {
  Farms {
    address
    abi
    BaseToken {
      address
      abi
      symbol
      decimals
      is_surged
      UnderlyingToken {
        address
        abi
        symbol
      }
    }
    PairedToken {
      address
      abi
      symbol
      decimals
      is_surged
      UnderlyingToken {
        address
        abi
        symbol
      }
    }
    LPToken {
      address
      abi
      symbol
    }
    is_legacy
  }
}
`


interface IFarm {
  abi: string
  address: string
  LPToken: {
    address: string
    abi: string
    symbol: string
  }
  BaseToken: {
    abi: string
    address: string
    decimals: number
    is_surged: boolean
    symbol: string
    UnderlyingToken: {
      abi: string
      address: string
      symbol: string
    }
  }
  PairedToken: {
    abi: string
    address: string
    decimals: number
    is_surged: boolean
    symbol: string
    UnderlyingToken: {
      address: string
      abi: string
      symbol: string
    }
  }
  is_legacy: boolean
}

interface IFarmData {
  /** name of the farm */
  name: string[]
  /** ethers.js contract for the farm */
  farmContract: Contract
  /** ethers.js contract for the baseToken */
  baseTokenContract: Contract
  /** ethers.js contract for the pairedToken */
  pairedTokenContract: Contract
  /** bool to check if the paired token is a surge asset */
  isPairedTokenSurged: boolean
  /** ethers.js contract for the LP Token Contract */
  LPTokenContract: Contract
  /** value of the users balance in LP tokens for the farmcontract */
  LPTokenBalance: string
  /** the base token symbol. Typically xUSD */
  baseSymbol: string
  /** the paired token symbol */
  pairedSymbol: string
  /** Amount of XUSD the farm has in its pairing */
  amountOfXUSDInFarm: string
  /** Amount of the other token the farm has in its pairing */
  amountOfPairingInFarm: string
  /** value of the total pairing token side in USD */
  valueOfPairingInFarm: string
  /** value of the total XUSD side in USD */
  valueOfXUSDInFarm: string
  /** value of users XUSD amount in the farm */
  valueOfUserXUSDInFarm: string
  /** Whether Approval is needed or not for farm */
  approvalNeeded: boolean
  /** Value Of User's PairedTokens in Farm */
  valueOfUserPairingInFarm: string
  valueOfXUSDRewardForUser: string
  valueOfPairingRewardForUser: string
  /** balance the user has in the farm in LP tokens */
  userFarmTokenBalance: string
  /** users base token balance in the farm in its native token representation */
  amountOfUserXUSDInFarm: string
  /** users paired token balance in the farm in its native token representation */
  amountOfUserPairingInFarm: string,
  /** pending rewards for the base token side of the LP */
  pendingBaseTokenRewards: string
  /** pending rewards for the paired token side of the LP */
  pendingPairedTokenRewards: string
  /** total value of the farm in USD */
  totalLiquidityForFarm: string
  /** calculated APR for the farm */
  APR: number | string | null
  /** total value the user has in the farm in USD */
  valueOfUserFarmTokens: string
  /** total amount claimed for all users per farm in USD */
  totalFarmRewards: string
  /** time until unstake in blocks */
  unstakeTimeBlocks: number
  /** time until unstake in human readable format */
  unstakeTime: string
  /** the fee for early unstaking from the farm*/
  earlyFee: number
  /** flag to check if see if farm is legacy*/
  is_legacy: boolean
}



export async function getBNBbalance(account, library) {
  const balanceRaw = await library.getBalance()
  const bnbBalance = parseFloat(ethers.utils.formatUnits(balanceRaw, 'ether'));
  
  return bnbBalance
}



/**
 * gets the price of BNB within an interval, populating the global State
 * @returns void
 */
export function useBNBPrice() {
  const { active, library } = useWeb3React('readOnly')
  const [bnbPrice, setBNBPrice] = useGlobalState('priceOfBNB');
  const [rerun, setRerun] = useGlobalState('rerun');

  React.useEffect(() => {
    const bnbInterval = setInterval(async () => {
      if (active) {
        priceOf(BNB.address).then(price => {
          setBNBPrice(price);
          setRerun(true);
        })
      }
    }, 10 * 1000)
    return () => {
      clearInterval(bnbInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return bnbPrice
}


export function useWalletListener() {
  const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React()
  const readOnly = useWeb3React('readOnly');
  const [rerun, setRerun] = useGlobalState('rerun');
  // const wssProvider = useWeb3React('wssProvider');
  const { loading, error, data } = useQuery(getTokenQuery);


  const onAny = (tokens) => {
    tokens.map((token: ITokenQuery) => {
      if (token.is_surged) {
        const contract = new Contract(token.address, token.abi, readOnly.library);
        const event = contract.on("*", (event) => {
          //token.name, "event: ", event)
          setRerun(true);
        })
      }
    })
  }

  useEffect(() => {
    if (active && data) {
      //'wallet listener active');
      onAny(data.tokens);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}





export function useService() {
  const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();
  const readOnly = useWeb3React('readOnly')
  const [generalTokenInfo, setGeneralTokenInfo] = useGlobalState('generalTokenInfo');
  const [depositedFarms, setDepositedFarms] = useGlobalState('depositedFarms');
  const [availableFarms, setAvailableFarms] = useGlobalState('availableFarms');
  const [BNBbalance, setBNBbalance] = useGlobalState('BNBbalance');
  const [poolData, setPoolData] = useGlobalState('poolData');
  const [pools, setPools] = useGlobalState('pools');
  const [XUSDData, setXUSDData] = useGlobalState('XUSDData')
  const [rerun, setRerun] = useGlobalState('rerun');

  const [totalFarmsValue, setTotalFarmsValue] = useGlobalState('totalFarmsValue');
  const [totalRewards, setTotalRewards] = useGlobalState('totalRewards');
  const [poolTotal, setPoolTotal] = useGlobalState('poolTotal');

  const tokenQuery = useQuery(getTokenQuery);
  const farmQuery = useQuery(getFarmsQuery);



  const getTokens = (tokens, library) => {
    return new Promise<any>((resolve, reject) => {
      const generalTokenInfo = {}

      const contractInstances = tokens.map(token => {
        let instancedToken = {
          ...token,
          contract: new Contract(token.address, token.abi, library),
          UnderlyingToken: token.UnderlyingToken ? {
            ...token.UnderlyingToken,
            contract: new Contract(token.UnderlyingToken.address, token.UnderlyingToken.abi, library)
          } : null
        }
        return instancedToken
      })


      Promise.all(contractInstances.map(async (instance) => {
        const priceInUnderlyingRaw = instance.is_surged ? await instance.contract.calculatePrice() : ethers.utils.parseUnits("1", instance.decimals);
        const priceInUnderlying = ethers.utils.formatUnits(
          priceInUnderlyingRaw, instance.is_surged ? instance.UnderlyingToken.decimals : instance.decimals
        );

        const priceOfToken = await priceOf(instance.address)
        const valueInBNB = await priceInBNB(priceOfToken.raw)


        // get quantity of tokens per instance
        const balanceRaw = await instance.contract.balanceOf(account)
        const balance = ethers.utils.formatUnits(balanceRaw, instance.decimals)

        // get quantity of tokens of the underlying asset per instance
        const underlyingBalanceRaw = instance.UnderlyingToken ?
          await instance.UnderlyingToken.contract.balanceOf(account) : ethers.utils.parseEther("0");
        const underlyingBalance = ethers.utils.formatUnits(underlyingBalanceRaw, instance.UnderlyingToken ? instance.UnderlyingToken.decimals : 'ether')

        // get value of holding in underlying asset per instance
        const totalValueInUnderlyingRaw = instance.is_surged ? await instance.contract.getValueOfHoldings(account) : ethers.utils.parseEther("0");
        const totalValueInUnderlying = ethers.utils.formatUnits(totalValueInUnderlyingRaw, instance.UnderlyingToken ? instance.UnderlyingToken.decimals : 'ether')


        // get underlying asset symbol per instance
        const underlyingSymbol = instance.UnderlyingToken ? instance.UnderlyingToken.symbol : instance.symbol;

        const stakeAllowance = instance.UnderlyingToken ?
          await instance.UnderlyingToken.contract.allowance(account, instance.contract.address) : null;

        const v1Address = '0x254246331cacbC0b2ea12bEF6632E4C6075f60e2'
        return {
          key: (instance.address.toLowerCase() == v1Address.toLowerCase() ? 'xUSD (v1)' : instance.symbol),
          data: {
            ...instance,
            name: instance.name,
            symbol: instance.symbol,
            isSurged: instance.is_surged,
            decimals: instance.decimals,
            underlyingDecimals: instance.UnderlyingToken?.decimals,
            quantity: balance,
            underlyingTokenBalance: underlyingBalance,
            underlyingSymbol: underlyingSymbol,
            valueInBNB: valueInBNB,
            valueInBUSD: priceOfToken.formatted,
            totalValueInUnderlying: totalValueInUnderlying,
            priceInUnderlying: priceInUnderlying,
            contract: instance.contract,
            underlyingContract: instance.UnderlyingToken?.contract,
            feeStruct: {
              buyFee: instance.buy_fee ? instance.buy_fee : 0,
              sellFee: instance.sell_fee ? instance.sell_fee : 0,
              transferFee: instance.transfer_fee ? instance.transfer_fee : 0,
              stakeFee: instance.stake_fee ? instance.stake_fee : 0,
            },
            stakeAllowance: stakeAllowance
          }
        }
      })).then(mappedTokens => {
        mappedTokens.forEach(token => {
          generalTokenInfo[token['key']] = token['data'];
        })
        //// // console.log('generalTokenInfo: ', generalTokenInfo);
        resolve(generalTokenInfo);
      })
    });
  }

  const calculateTotal = (array: IFarmData[], key: string): string => {
    let total: BigNumber = array.reduce(
      (accumulated: BigNumber, currentValue: IFarmData) => {
        accumulated = accumulated.add(wrap(currentValue[key], 0));
        return accumulated
      },
      ethers.utils.parseUnits("0")
    )
    total = total.add(BigNumber.from('4200000000000000000000'))
    return unwrap(total)
  }


  const getValuesOfAssetsInFarm = async (LPTokenContract, farmContract, baseTokenContract, pairedTokenContract, underlyingContract) => {
    // console.log('farmContract: ', farmContract);
    const [
      [xUSDAmount, pairAmount],
      lSupply,
      LPtSupply,
      pairTokenDecimals,
      baseDecimals,
      xusdPrice
    ] = await Promise.all([
      farmContract.getTotalQuantitiesInLP(),
      LPTokenContract.balanceOf(farmContract.address),
      LPTokenContract.totalSupply(),
      pairedTokenContract.decimals(),
      baseTokenContract.decimals(),
      baseTokenContract.calculatePrice()
    ])
    // // // console.log(`getValuesOfAssetsInFarm 1: ${performance.now() - start} milliseconds`);
    // start = performance.now();

    const amountXUSDInFarm = wrap(lSupply.mul(xUSDAmount).div(LPtSupply).toString(), baseDecimals) // in wei
    // // // console.log(`getValuesOfAssetsInFarm 2: ${performance.now() - start} milliseconds`);
    // start = performance.now();
    const amountPairingInFarm = wrap(lSupply.mul(pairAmount).div(LPtSupply).toString(), pairTokenDecimals) //in wei // <<<<<<<<<<
    // // // console.log(`getValuesOfAssetsInFarm 3: ${performance.now() - start} milliseconds`);
    // start = performance.now();

    const xusdValue = amountXUSDInFarm.mul(xusdPrice).div(ethers.utils.parseEther('1'));

    // // // console.log(`getValuesOfAssetsInFarm 4: ${performance.now() - start} milliseconds`);
    // start = performance.now();
    const priceOfPairing = await priceOf(pairedTokenContract.address);

    const pairingValue = priceOfPairing.raw.mul(amountPairingInFarm).div(ethers.utils.parseEther('1')) // <<<<<<<

    return {
      LPtSupply: LPtSupply,
      amountXUSDInFarm: amountXUSDInFarm,
      amountPairingInFarm: amountPairingInFarm,
      valueOfXUSDInFarm: xusdValue,
      valueOfPairingInFarm: pairingValue,
    }
  }

  let performance_results = [];
  const fetchFarmData = async (farm, signer): Promise<IFarmData> => {
    // // // console.log('beginning', farm, farm.BaseToken.symbol, farm.PairedToken.symbol);
    // let performances = [];
    // performances.push(performance.now());

    const farmContract = new Contract(farm.address, farm.abi, signer);
    const baseTokenContract = new Contract(farm.BaseToken.address, farm.BaseToken.abi, signer);
    const pairedTokenContract = new Contract(farm.PairedToken.address, farm.PairedToken.abi, signer);
    const pairedTokenUnderlyingContract = farm.PairedToken.is_surged ?
      new Contract(farm.PairedToken.UnderlyingToken.address, farm.PairedToken.UnderlyingToken.abi, signer) : null;

    const LPTokenContract = new Contract(farm.LPToken.address, farm.LPToken.abi, signer);
    const farmManagerContract_old = new Contract(farm_manager_old.address, farm_manager_old.abi, signer);
    const farmManagerContract = new Contract(farm_manager.address, farm_manager.abi, signer);
    const farmName = [`${farm.PairedToken.symbol}`, `${farm.BaseToken.symbol}`]
    //const farmName = farm.is_legacy ? [`${farm.PairedToken.symbol}`, `${farm.BaseToken.symbol}`] : [`${farm.BaseToken.symbol}`, `${farm.PairedToken.symbol}`]
    /**
     * test addresses:
     * 0x41d52fe42f14f14381f23f93ef92dc784cdb2b50
     * 0x57945e2e3b32fb0633ede87652cb14e79275fdaf <<< why is my address in here lol :D
     */
    // // // console.log('xusdPrice thing', 1, farm.BaseToken.symbol, farm.PairedToken.symbol)
    const [
      xusdPrice,
      [xUSDredeemable, pairRedeemable],
      farmBal,
      farmTotal,
      pairedTokenDecimals,
      getValuesAndAmountsInFarm,
    ] = await Promise.all([
      baseTokenContract.calculatePrice(),
      farmContract.getRedeemableValue(account),
      farmContract.balanceOf(account),
      farmContract.totalSupply(),
      pairedTokenContract.decimals(),
      getValuesOfAssetsInFarm(LPTokenContract, farmContract, baseTokenContract, pairedTokenContract, pairedTokenUnderlyingContract),
    ]);

    // // // console.log('farmBal', farmBal);
    // performances.push(performance.now()); // number 1

    let getAmountOfUserPairingFarmHoldings = farmTotal.eq('0') ? BigNumber.from('0') : pairRedeemable.mul(getValuesAndAmountsInFarm.LPtSupply).div(farmTotal)
    let getAmountOfUserXUSDFarmHoldings = farmTotal.eq('0') ? BigNumber.from('0') : xUSDredeemable.mul(getValuesAndAmountsInFarm.LPtSupply).div(farmTotal) // getValuesAndAmountsInFarm.amountXUSDInFarm.mul(farmBal).div(farmTotal)
    if (farmName[0] != 'BNB') {
      getAmountOfUserPairingFarmHoldings = getAmountOfUserPairingFarmHoldings.mul(ethers.utils.parseEther('1'))
    }
    const getValueOfUserXUSDFarmHoldings = getAmountOfUserXUSDFarmHoldings.mul(xusdPrice).div(ethers.utils.parseEther('1'));
    const getValueOfUserXUSDFarmHoldingsNonLegacy = xUSDredeemable.mul(xusdPrice).div(ethers.utils.parseEther('1'));

    const priceOfPairedTokenContract = await priceOf(pairedTokenContract.address);
    const getValueOfUserPairingFarmHoldings = priceOfPairedTokenContract.raw.mul(getAmountOfUserPairingFarmHoldings).div(ethers.utils.parseEther('1'))  //await convertSurgeTokenToBUSD(getAmountOfUserPairingFarmHoldings, pairedTokenContract, pairedTokenUnderlyingContract); // this is the culprit for #2
    const getValueOfUserPairingFarmHoldingsNonLegacy = priceOfPairedTokenContract.raw.mul(pairRedeemable).div(ethers.utils.parseEther('1'))  //await convertSurgeTokenToBUSD(getAmountOfUserPairingFarmHoldings, pairedTokenContract, pairedTokenUnderlyingContract); // this is the culprit for #2

    // performances.push(performance.now()); // number 2
    // // // console.log('perfomance')

    const amountOfXUSDInFarm = getValuesAndAmountsInFarm.amountXUSDInFarm
    const amountOfPairingInFarm = getValuesAndAmountsInFarm.amountPairingInFarm
    const valueOfXUSDInFarm = getValuesAndAmountsInFarm.valueOfXUSDInFarm
    const valueOfPairingInFarm = getValuesAndAmountsInFarm.valueOfPairingInFarm

    let amountOfUserXUSDInFarm;
    let amountOfUserPairingInFarm;
    let valueOfUserXUSDInFarm;
    let valueOfUserPairingInFarm;

    if (farm.is_legacy) {
      amountOfUserXUSDInFarm = getAmountOfUserXUSDFarmHoldings
      amountOfUserPairingInFarm = getAmountOfUserPairingFarmHoldings
      valueOfUserXUSDInFarm = getValueOfUserXUSDFarmHoldings
      valueOfUserPairingInFarm = getValueOfUserPairingFarmHoldings
    } else {
      amountOfUserXUSDInFarm = xUSDredeemable//getAmountOfUserXUSDFarmHoldings
      amountOfUserPairingInFarm = pairRedeemable//getAmountOfUserPairingFarmHoldings
      valueOfUserXUSDInFarm = getValueOfUserXUSDFarmHoldingsNonLegacy
      valueOfUserPairingInFarm = getValueOfUserPairingFarmHoldingsNonLegacy
    }


    const totalFarmRewards = farm.is_legacy ? (await farmManagerContract_old.getTotalRewardsForFarm(farm.address)) : [await farmContract.totalRewards(), BigNumber.from('0')]
  
    const unstakeTimeBlocks = await farmContract.getTimeUntilUnlock(account)
    const unstakeTime = convertBlocksToTime(unstakeTimeBlocks)
    const earlyFee = 100 - (await farmContract.earlyFee())
    // // // console.log("unstakeTime: ", unstakeTime)
    const totalRewardsClaimedForUser = await farmContract.totalRewardsClaimedForUser(account);

    // performances.push(performance.now()); // number 3

    let rewXUSD: BigNumber;
    let rewPairing: BigNumber;

    if (farm.PairedToken.symbol !== 'BNB') {
      rewXUSD = wrap(totalRewardsClaimedForUser[0], 18);
      rewPairing = wrap(totalRewardsClaimedForUser[1], 0);
    } else {
      rewXUSD = wrap(totalRewardsClaimedForUser, 18);
      rewPairing = BigNumber.from(0);
    }

    // // // console.log('priceOfBaseToken thing', 2, farm.BaseToken.symbol, farm.PairedToken.symbol)
    const [priceOfBaseToken, priceOfPairedToken] = await Promise.all([
      priceOf(baseTokenContract.address),
      priceOf(pairedTokenContract.address),
    ])

    const rawBase = farm.is_legacy ? priceOfBaseToken.raw : priceOfPairedToken.raw;

    const valueOfXUSDRewardForUser = rewXUSD.mul(rawBase).div(ethers.utils.parseEther('1'))
    const valueOfPairingRewardForUser = rewPairing.mul(priceOfPairedToken.raw).div(ethers.utils.parseEther('1'))

    // performances.push(performance.now());
    const totalRewardsXUSD = wrap(totalFarmRewards[0].toString(), 18)
    const totalRewardsPairing = totalFarmRewards[1].isZero() ? ethers.utils.parseEther("0") : wrap(totalFarmRewards[1], pairedTokenDecimals)
    // performances.push(performance.now()); // number 4

    const valueOfXUSDReward = totalRewardsXUSD.mul(rawBase).div(ethers.utils.parseEther('1'));
    const valueOfPairingReward = farm.is_legacy ? totalRewardsPairing.mul(priceOfPairedToken.raw).div(ethers.utils.parseEther('1')) : BigNumber.from('1');

    // performances.push(performance.now()); // number 5

    let totalRewardsForFarm = valueOfXUSDReward.add(valueOfPairingReward); // <<< this is off

    // TODO: weird!
    //if (farmName[0] == 'BNB' && farmName[1] == 'xUSD') {
    const v1LP = '0x839b8fFd6329Bdc7DC5bBaFFFbdF18cEd75A4C96';
    if (LPTokenContract.address.toLowerCase() === v1LP.toLowerCase()) {
      totalRewardsForFarm = totalRewardsForFarm.add(BigNumber.from(9000).mul(BigNumber.from(10).pow(18)));
    }

    // // // console.log('pendingXUSD thing', 3, farm.BaseToken.symbol, farm.PairedToken.symbol)
    let pendingRewards: any = [ethers.utils.parseUnits("0"), ethers.utils.parseUnits("0")];
    try {
      pendingRewards = await farmContract.pendingRewards(account);
      if (!Array.isArray(pendingRewards)) {
        pendingRewards = [pendingRewards, ethers.utils.parseUnits("0")]
      }
    } catch (error) {
      // console.log('pendingRewards error', error)
    }
    const [pendingXUSD, pendingPair]: [BigNumber, BigNumber] = pendingRewards

    const totalUSDInFarm = valueOfXUSDInFarm.add(valueOfPairingInFarm)
    const totalUSDInFarmForUser = valueOfUserXUSDInFarm.add(valueOfUserPairingInFarm)

    // performances.push(performance.now()); // number 6

    // hardcoded values: TODO
    const APR = () => {

      const startingDate = (symbol) => {

        switch (symbol) {                                   // MURICA (MM-DD-YYYY)      // EVERYONE ELSE (DD-MM-YYYY)
          case 'BNB': return new Date(2022, 2, 31);         // '11-07-2021'             // 07-11-2021
          case 'sBTC': return new Date(2021, 11, 9);        // '12-09-2021'             // 09-12-2021
          case 'sADA': return new Date(2021, 11, 9);        // '12-09-2021'             // 09-12-2021
          case 'sUSELESS': return new Date(2021, 11, 9);    // '12-09-2021'             // 09-12-2021
          case 'SUSE': return new Date(2022, 3, 7);          // '04-07-2022'             // 04-07-2022
          default: return new Date(2021, 11, 9);            // '11-08-2021'             // 09-12-2021
        }
      }



      const startDate = startingDate(farm.PairedToken.symbol);

      // get the number of days since the start date
      const daysSinceStart = moment().diff(startDate, 'days');

      const rate = (parseFloat(unwrap(totalRewardsForFarm)) / parseFloat(unwrap(totalUSDInFarm))) / daysSinceStart;

      return (100 * (Math.pow((1 + (rate)), 365) - 1))

    }

    // performances.push(performance.now()); // number 7


    // get LP token balance
    const LPTokenBalance = await LPTokenContract.balanceOf(account)

    const TokenApproval = await LPTokenContract.allowance(account, farm.address);

    const max = ethers.utils.parseUnits("2", 53);
    const needs = max.div(BigNumber.from('2')).gt(TokenApproval);

    const _APR = `${APR().toFixed(2)}%`;

    // performances.push(performance.now()); // number 8

    // performance_results.push({
    //   farm: farmName,
    //   performance: performances,
    // });
    const returnedValue: IFarmData = {
      name: farmName,
      farmContract: farmContract,
      baseTokenContract: baseTokenContract,
      pairedTokenContract: pairedTokenContract,
      LPTokenContract: LPTokenContract,
      LPTokenBalance: unwrap(LPTokenBalance),
      isPairedTokenSurged: farm.PairedToken.is_surged,
      baseSymbol: farm.BaseToken.symbol,
      pairedSymbol: farm.PairedToken.symbol,

      amountOfXUSDInFarm: unwrap(amountOfXUSDInFarm),
      amountOfPairingInFarm: unwrap(amountOfPairingInFarm),

      valueOfXUSDInFarm: unwrap(valueOfXUSDInFarm),
      valueOfPairingInFarm: unwrap(valueOfPairingInFarm),

      amountOfUserXUSDInFarm: unwrap(amountOfUserXUSDInFarm),
      amountOfUserPairingInFarm: unwrap(amountOfUserPairingInFarm),

      valueOfUserXUSDInFarm: unwrap(valueOfUserXUSDInFarm),
      valueOfUserPairingInFarm: unwrap(valueOfUserPairingInFarm),

      userFarmTokenBalance: unwrap(farmBal),
      totalLiquidityForFarm: unwrap(totalUSDInFarm),
      valueOfUserFarmTokens: unwrap(totalUSDInFarmForUser),


      valueOfXUSDRewardForUser: unwrap(valueOfXUSDRewardForUser),
      valueOfPairingRewardForUser: unwrap(valueOfPairingRewardForUser),

      unstakeTimeBlocks: unstakeTimeBlocks,
      unstakeTime: unstakeTime,
      earlyFee: earlyFee,

      approvalNeeded: needs,

      APR: _APR,
      pendingBaseTokenRewards: unwrap(pendingXUSD),
      pendingPairedTokenRewards: unwrap(wrap(pendingPair.toString(), pairedTokenDecimals)),
      totalFarmRewards: unwrap(totalRewardsForFarm),
      is_legacy: farm.is_legacy
    }

    //// // console.log('ending', farm, farm.BaseToken.symbol, farm.PairedToken.symbol);

    return returnedValue
  }

  const setupFarmData = (farms: IFarm[], signer) => {
    return farms.map(farm => {
      return fetchFarmData(farm, signer)
    })
  }

  const fetchMAXIAPY = (currentMAXIPrice) => {

    const growth = parseFloat(ethers.utils.formatEther(currentMAXIPrice)) - 1.0045;

    const startDate = new Date(2022, 4, 6);
    const duration = moment().diff(startDate, 'days');

    const rate = growth / duration;

    const APY = `${(( Math.pow(1 + rate, 365) - 1 ) * 100).toFixed(2)}%`;
    return APY
  }

  const fetchEARNAPR = (totalRewards: number, totalLiquidity: number) => {
    const priceOfBNB = getGlobalState('priceOfBNB')
    // console.debug(`totalRewards: ${totalRewards}`, `duration: ${duration}`, `totalLiquidity: ${totalLiquidity}\n`, `APR:${(((totalRewards) / (duration * (totalLiquidity))) * 365) } ${((((totalRewards) / (duration * (totalLiquidity))) * 365) * 100).toFixed(2)}%`);

    const startDate = new Date(2022, 4, 13);
    const duration = moment().diff(startDate, 'days');

    const donation = 2.3 * parseFloat(priceOfBNB.formatted) 
    const rate = (totalRewards - donation) / (duration * totalLiquidity)
    // console.debug(`totalRewards: ${totalRewards} \ntotalRewards(fixed): ${totalRewards - donation}`);
    // console.debug(`rate: ${(365 * (rate) * 100).toFixed(2)} \nrate(fixed): ${(365 * ((totalRewards - donation) / (duration * totalLiquidity)) * 100).toFixed(2)}`);

    // const APY = `${(( Math.pow(1 + rate, 365) - 1 ) * 100).toFixed(2)}%`;
    const APR = `${(365 * rate * 100).toFixed(2)}%`;
    return APR
  }

  
  const fetchXUSDdata = async () => {
    const XUSDContract = new ethers.Contract(xUSDV2.address, xUSDV2.abi, library.getSigner());
    const [XUSDPriceRaw, XUSDBalanceOfUserRaw] = await Promise.all([XUSDContract.calculatePrice(), XUSDContract.balanceOf(account)]);
    const XUSDBalanceOfUser = ethers.utils.formatUnits(XUSDBalanceOfUserRaw, 'ether');
    const XUSDPrice = ethers.utils.formatUnits(XUSDPriceRaw, 'ether');

    const XUSD_DATA: IXUSDData = {
      Contract: XUSDContract,
      Price: XUSDPrice,
      userXUSDBalance: XUSDBalanceOfUser
    }
    setXUSDData(XUSD_DATA)
  }

  const fetchPoolData = async () => {
    const maxiContract = new ethers.Contract(XUSD_MAXI.address, XUSD_MAXI.abi, library.getSigner());
    const XUSDContract = new ethers.Contract(xUSDV2.address, xUSDV2.abi, library.getSigner());
    const EARNContract = new ethers.Contract(XUSDEARN.address, XUSDEARN.abi, library.getSigner())
    // MAXI Data
    const [
        poolBalanceOfUserRaw,
        XUSDPriceRaw,
        XUSDBalanceOfMAXIRaw,
        approvalNeededRaw,
        userInfo,
        XUSDBalanceOfUserRaw,
        unstakeTimeBlocksRaw,
        leaveEarlyFeeRaw,
        maxiCurrentPrice
    ] = await Promise.all([
        maxiContract.balanceOf(account),
        XUSDContract.calculatePrice(),
        XUSDContract.balanceOf(XUSD_MAXI.address),
        XUSDContract.allowance(account, XUSD_MAXI.address),
        maxiContract.userInfo(account),
        XUSDContract.balanceOf(account),
        maxiContract.remainingLockTime(account),
        maxiContract.leaveEarlyFee(),
        maxiContract.calculatePrice()
    ])

    // EARN Data
    const [
      XUSDLockedInEARN,
      approvalNeededRawEARN,
      userInfoEARN,
      unstakeTimeBlocksRawEARN,
      leaveEarlyFeeRawEARN,
      rewardTokenAddress,
      rewardDEXAddress,
      totalRewardsEARN,
      pendingRewardsEARNRaw,
    ] = await Promise.all([
      XUSDContract.balanceOf(XUSDEARN.address),
      XUSDContract.allowance(account, XUSDEARN.address),
      EARNContract.userInfo(account),
      EARNContract.timeUntilUnlock(account),
      EARNContract.leaveEarlyFee(),
      EARNContract.getRewardToken(account),
      EARNContract.getRewardTokenDEX(account),
      EARNContract.totalRewards(),
      EARNContract.pendingRewards(account)
    ])

    // General Data
    const XUSDPrice = ethers.utils.formatUnits(XUSDPriceRaw, 'ether');
    const XUSDBalanceOfUser = ethers.utils.formatUnits(XUSDBalanceOfUserRaw, 'ether');
    const price_of_bnb = await priceOfBNB()

    // EARN Data
    const XUSDBalanceOfEARN = ethers.utils.formatUnits(XUSDLockedInEARN, 'ether');
    const totalLiquidityEARN = (parseFloat(XUSDBalanceOfEARN) * parseFloat(XUSDPrice));
    const XUSDStakedForUser = ethers.utils.formatUnits(userInfoEARN.amount, 'ether')
    const USDStakedForUser = parseFloat(XUSDStakedForUser) * parseFloat(XUSDPrice);
    const approvalNeededEARN = ethers.utils.parseEther("1000000000").gt(approvalNeededRawEARN)
    const unstakeTimeBlocksEARN = unstakeTimeBlocksRawEARN.toString()
    const leaveEarlyFeeEARN = (leaveEarlyFeeRaw/10).toString();
    const rewardTokenContract = new Contract(rewardTokenAddress, standardABI, library.getSigner())
    // pending rewards in BNB
    const pendingRewards = ethers.utils.formatUnits(pendingRewardsEARNRaw, 'ether');
    // convert pending rewards to reward token
    let rewardPrice: {raw: BigNumber, formatted: string};
    let pendingRewardsInRewardToken;
    if (parseFloat(pendingRewards) >= 0.00001) {
      try {
        rewardPrice = await multiDexPriceOf(rewardTokenAddress, rewardDEXAddress)
        pendingRewardsInRewardToken = parseFloat(pendingRewards) * parseFloat(price_of_bnb.formatted) / parseFloat(rewardPrice.formatted)
        // console.log('reward price: ', rewardPrice)
      } catch (err) {
        // console.log('MultiDex Price Oracle Error')
        console.error(err)
        rewardPrice = {raw: BigNumber.from('0'), formatted: '1'}
        pendingRewardsInRewardToken = '0'
      }
    } else {
      rewardPrice = {raw: BigNumber.from('0'), formatted: '1'}
      pendingRewardsInRewardToken = '0'
    }

    // console.log('Reward Price: ', rewardPrice.formatted)
    // console.log('PENDING REWARDS IN REWARD TOKEN: ', pendingRewardsInRewardToken)

    // total rewards of EARN Pool
    const totalRewards = parseFloat(ethers.utils.formatUnits(totalRewardsEARN, 'ether')) * parseFloat(price_of_bnb.formatted);
    // total rewards for user in USD
    const userTotalRewards = parseFloat(ethers.utils.formatUnits(userInfoEARN.totalRewardsEarned, 'ether'));
    const userTotalRewardsUSD = userTotalRewards * parseFloat(price_of_bnb.formatted)
    let rewardTokenSymbol:string = await rewardTokenContract.symbol();
    if (!rewardTokenSymbol) {
      rewardTokenSymbol = 'XUSD'
      // console.log('Error Fetching Reward Token Symbol')
    }

    // MAXI Data
    const XUSDBalanceOfMAXI = ethers.utils.formatUnits(XUSDBalanceOfMAXIRaw, 'ether');
    const poolBalanceOfUserUSD = ethers.utils.formatUnits(poolBalanceOfUserRaw, 'ether');
    const poolBalanceOfUserXUSD = mathFloor(parseFloat(poolBalanceOfUserUSD) / parseFloat(XUSDPrice), 6);
    const approvalNeeded = ethers.utils.parseEther("1000000000").gt(approvalNeededRaw)
    const unstakeTimeBlocks = unstakeTimeBlocksRaw;
    const leaveEarlyFee = (leaveEarlyFeeRaw/10).toString();
    const totalStaked = parseFloat(mathFloor(ethers.utils.formatEther(userInfo.totalStaked), 6))
    const totalWithdrawn = parseFloat(mathFloor(ethers.utils.formatEther(userInfo.totalWithdrawn), 6))
    const overallXUSDProfit = (parseFloat(poolBalanceOfUserXUSD) - (totalStaked - totalWithdrawn)).toString();
    const overallXUSDProfitUSD = (parseFloat(overallXUSDProfit) * parseFloat(XUSDPrice)).toString();
    const totalLiquidity = (parseFloat(XUSDBalanceOfMAXI) * parseFloat(XUSDPrice)).toString()
    const MAXI_APR = fetchMAXIAPY(maxiCurrentPrice)
    const EARN_APR = fetchEARNAPR(totalRewards, totalLiquidityEARN)

    const all_Pools: IPoolData[] = []

    const EARN_DATA = {
      StakingContract: EARNContract,
      poolBalanceOfUser: {
        XUSD: XUSDStakedForUser,
        USD: USDStakedForUser < 0.01 ? `${0.00}`: USDStakedForUser.toString(),
      },
      XUSDLocked: XUSDBalanceOfEARN,
      overallProfit: {
        XUSD: userTotalRewards.toString(),
        USD: userTotalRewardsUSD.toString()
      },
      totalLiquidity: totalLiquidityEARN.toString(),
      approvalNeeded: approvalNeededEARN,
      rewardToken: rewardTokenSymbol,
      poolName: 'XUSD EARN',
      APR: EARN_APR,
      unstakeTimeBlocks: unstakeTimeBlocksEARN,
      leaveEarlyFee: leaveEarlyFeeEARN,
      pendingRewards: pendingRewardsInRewardToken,
      rewardPrice: (parseFloat(rewardPrice.formatted) * parseFloat(pendingRewardsInRewardToken)).toString()
  }

    const MAXI_DATA = {
      StakingContract: maxiContract,
      poolBalanceOfUser: {
        XUSD: poolBalanceOfUserXUSD,
        USD: poolBalanceOfUserUSD,
      },
      XUSDLocked: XUSDBalanceOfMAXI,
      overallProfit: {
        XUSD: overallXUSDProfit,
        USD: overallXUSDProfitUSD
      },
      totalLiquidity: totalLiquidity,
      approvalNeeded: approvalNeeded,
      rewardToken: 'XUSD',
      poolName: 'XUSD MAXI',
      APR: MAXI_APR,
      unstakeTimeBlocks: unstakeTimeBlocks,
      leaveEarlyFee: leaveEarlyFee,
      pendingRewards: '--',
      rewardPrice: '--'
    }

    // console.log('MAXI Data', MAXI_DATA)
    all_Pools.push(MAXI_DATA)

    // console.log('EARN Data', EARN_DATA)
    all_Pools.push(EARN_DATA)
    setPoolTotal({
      XUSD: (parseFloat(XUSDStakedForUser) + parseFloat(poolBalanceOfUserXUSD)).toString(),
      USD: ((USDStakedForUser < 0.01 ? 0: USDStakedForUser) + parseFloat(poolBalanceOfUserUSD)).toString() 
    })
    setPools([
      ... all_Pools
    ])
  }

  const fetchData = () => {
    // // // console.log("fetching data 1")
    // // // console.log(active, library, rerun)
    if (active && library && rerun) {
      // // // console.log("fetching data ReRun is TRUE")
      /** fetches all the token info & calculates values */
      if (tokenQuery.data) {
        getTokens(tokenQuery.data.Tokens, library.getSigner()).then(res => {
          // // // console.log('RES', res);
          setGeneralTokenInfo(res);
        })
      }

      /** fetches all the farm info & calculates values */
      if (farmQuery.data) {
        //// // console.log("fetching data 2", farmQuery.data)
        Promise.all(setupFarmData(farmQuery.data.Farms, library.getSigner())).then(async farms => {
          let tot = 0
          //// // console.log('breakdown:')
          for (let res in performance_results) {
            //// // console.log('for farm: ', performance_results[res].farm)
            let performances = performance_results[res].performance;
            for (let i = 0; i < performances.length; i++) {
              if (i > 0) {
                // // // console.log(`${i}: ${performances[i] - performances[i - 1]} milliseconds`)
              }
            }
            const subtot = performances[performances.length - 1] - performances[0]
            //// // console.log(`total: ${subtot} milliseconds`)
            tot += subtot
          }
          let start = performance.now();
          setTotalRewards(calculateTotal(farms, "totalFarmRewards"))
          setTotalFarmsValue(calculateTotal(farms, "totalLiquidityForFarm"));

          farms.forEach(farm => {
            const address = farm.farmContract.address
            if (wrap(farm.userFarmTokenBalance, 0).gt(0)) {

              if (availableFarms[address] !== undefined) {
                const _farms = availableFarms;
                delete _farms[address];
                setAvailableFarms(prevState => ({ ...prevState, ..._farms }))
              }

              depositedFarms[address] = farm
              setDepositedFarms(prevState => ({ ...prevState, ...depositedFarms }))

            } else {

              if (depositedFarms[address] !== undefined) {
                const _farms = depositedFarms;
                delete _farms[address];
                setDepositedFarms(prevState => ({ ...prevState, ..._farms }))
              }

              availableFarms[address] = farm
              setAvailableFarms(prevState => ({ ...prevState, ...availableFarms }))

            }
          })
          fetchXUSDdata();
          fetchPoolData();
          getBNBbalance(account, library.getSigner()).then(bal => {
            setBNBbalance(bal);
          }).catch(err => {
            console.error('error fetching BNB balance: ', err);
          });
          // setBNBbalance(await getBNBbalance(account, library.getSigner()))
          // // // console.log(`divide up available and deposited farms: ${performance.now() - start} miliseconds`)
          // // // console.log('depositedFarms', depositedFarms)
          setRerun(false)
        })
      }
    }
  }

  React.useEffect(() => {
    if (active && library && rerun) {
      // run only once
      fetchData()
      // 
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, library, rerun])


}



export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    setIsMobile(Boolean(navigator.userAgent.match(
      /Android|iPhone|iPad|iPod|Opera Mini/i
    )))
  }, [])
  return isMobile
}


export function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useGlobalState('windowSize');

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      const size = {
        width: window.innerWidth,
        height: window.innerHeight,
      }
      setWindowSize(size);
    }
    // Add event listener
    window.addEventListener("resize", handleResize);
    // Call handler right away so state gets updated with initial window size
    handleResize();
    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array ensures that effect is only run on mount

}

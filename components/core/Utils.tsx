import { pcsRouter, BNB, BUSD, pancake_factory, priceOracle, multiDexPriceOracle } from "../wallet/Contracts";
import { BigNumber, BigNumberish, Contract, ethers, logger } from "ethers";
import { getGlobalState, setGlobalState, useGlobalState } from './StateManager';
import moment from 'moment';
import { TransactionResponse, TransactionReceipt } from "@ethersproject/providers";
import { Stack, Typography } from "@mui/material";


export const readOnlyProvider = new ethers.providers.JsonRpcBatchProvider(
    "https://bsc-dataseed.binance.org:443"
);

// TODO: check for failed txs
/**
 * @description This function is used to handle the transaction responses.
 * @param enqueueSnackbar - The enqueueSnackbar function.
 * @param {Promise<TransactionResponse>} txResponse - The transaction response.
 */
export async function TxHandler(enqueueSnackbar, tx: Promise<TransactionResponse>, pendingMsg: string, successMsg: string, errorMsg: string) {
    
    tx.then(async (txResponse: TransactionResponse) => {
        snackbar(enqueueSnackbar, 'info', pendingMsg, txResponse.hash);
        // enqueueSnackbar((<Typography >check tx at: <a rel="noreferrer" target="_blank" href={"https://bscscan.com/tx/"+txResponse.hash}>{txResponse.hash}</a></Typography>), { variant: 'info' });
        const receipt: TransactionReceipt = await txResponse.wait(2);
        
        switch(receipt.status) {
            case 0:
                if (receipt.transactionHash !== undefined && receipt.transactionHash !== null) {
                    snackbar(enqueueSnackbar, 'error', errorMsg, receipt.transactionHash);
                } else {
                    snackbar(enqueueSnackbar, 'error', errorMsg);
                }
                // enqueueSnackbar((<Typography >tx failed</Typography>), { variant: 'error' });
                break;
            case 1:
                snackbar(enqueueSnackbar, 'success', successMsg, receipt.transactionHash);
                // enqueueSnackbar((<Typography >transaction successful check tx at: <a rel="noreferrer" target="_blank" href={"https://bscscan.com/tx/"+receipt.transactionHash}>{receipt.transactionHash}</a></Typography>), { variant: 'success' });
                break;
            default:
                if (receipt.transactionHash !== undefined && receipt.transactionHash !== null) {
                    snackbar(enqueueSnackbar, 'error', errorMsg, receipt.transactionHash);
                } else {
                    snackbar(enqueueSnackbar, 'error', errorMsg);
                }
                // enqueueSnackbar((<Typography >tx failed</Typography>), { variant: 'error' });
        }
    }).catch(async (error) => {
        if (error.data) {
            snackbar(enqueueSnackbar, 'error', errorMsg, '', error.data.message);
        } else if (error.message) {
            snackbar(enqueueSnackbar, 'error', errorMsg, '', error.message);
        } else {
            snackbar(enqueueSnackbar, 'error', errorMsg, '', error);
        }
        // enqueueSnackbar((<Typography >tx failed error: {error.message}</Typography>), { variant: 'error' });
    }).finally(() => {
        setGlobalState('rerun', true);
        // setRerun(true)
        //update the page again
        // // console.log('update page')
      });
}
function snackbar(enqueueSnackbar,  variant: 'success' | 'error' | 'info', msg: string, hash:string = '', error: string = '') {
    enqueueSnackbar((
        <Stack>
            {error !== '' ? 
            (<Stack>
                <Typography >{msg}</Typography>
                <Typography >{`error: ${error}`}</Typography>
            </Stack>) : 
            (<Typography >{msg}</Typography>)}
            
            {hash === "" ? <></> : (
                <Typography >check tx at: <a rel="noreferrer" target="_blank" href={"https://bscscan.com/tx/"+hash}>{hash}</a></Typography>
            )}
        </Stack>
    ), { variant: variant });
}

export const pancakeRouter = new Contract(pcsRouter.address, pcsRouter.abi, readOnlyProvider);
export const pancakeFactory = new Contract(pancake_factory.address, pancake_factory.abi, readOnlyProvider);
export const BNBContract = new Contract(BNB.address, BNB.abi, readOnlyProvider)
export const BUSDContract = new Contract(BUSD.address, BUSD.abi, readOnlyProvider)
export const priceOracleContract = new Contract(priceOracle.address, priceOracle.abi, readOnlyProvider)
export const multiDexPriceOracleContract = new Contract(multiDexPriceOracle.address, multiDexPriceOracle.abi, readOnlyProvider)

export async function priceOfBNB(): Promise<{raw: BigNumber, formatted: string}> {
    const fromGlobalState = getGlobalState('priceOfBNB')
    if(fromGlobalState.raw == undefined) {
        // // // console.log('NOT in global state')
    }
    return fromGlobalState.raw != undefined ? fromGlobalState : await priceOf(BNB.address);
}

/**
 * gets price of token in USD
 * @param address 
 * @returns string - price in USD
 */
export async function priceOf(address: string): Promise<{raw: BigNumber, formatted: string}> {
    const price = await priceOracleContract.priceOf(address);
    return {
        raw: price,
        formatted: unwrap(price)
    }
}

/**
 * gets price of token in USD
 * @param address  token address
 * @param dex  dex address
 * @returns string - price in USD
 */
 export async function multiDexPriceOf(address: string, dex: string): Promise<{raw: BigNumber, formatted: string}> {
    const price = await multiDexPriceOracleContract.priceOf(address, dex);
    return {
        raw: price,
        formatted: unwrap(price)
    }
}

/**
 * gets the price of a list of tokens in USD
 * @param address 
 * @returns string[] - prices in USD
 */
export async function pricesOf(addresses: string[]): Promise<{raw: BigNumber, formatted: string}[]> {
    const prices = await priceOracleContract.pricesOf(addresses);
    return prices.map(price => {
        return {
            raw: price,
            formatted: unwrap(price)
        }
    });
}

export async function priceInBNB(priceOfTokenRaw, tokenAmount = BigNumber.from(1)): Promise<string> {
    const pob = await priceOfBNB();
    // // // console.log('priceInBNB function', priceOfTokenRaw, tokenAmount, pob.formatted)
    return adjustDecimals(priceOfTokenRaw.mul(ethers.utils.parseEther("1")).mul(tokenAmount).div(pob.raw), -18);
}

export async function priceInToken(priceOfTokenRaw, tokenAddress , tokenAmount = BigNumber.from(1)): Promise<string> {
    const poua = await priceOf(tokenAddress);
    return adjustDecimals(priceOfTokenRaw.mul(ethers.utils.parseEther("1")).mul(tokenAmount).div(poua.raw), -18)
}


/**
 * Converts the value into BUSD
 * @param {BigNumber} value - The value in wei format 
 * @param {Contract} contract - contract of the token to convert
 * @param {Contract} underlyingContract - contract of the underlying token of the token to convert
 * @returns {Promise<string>}
 */
export async function convertSurgeTokenToBUSD(value: BigNumber, contract: Contract, underlyingContract?: Contract): Promise<BigNumber> {
    if (underlyingContract == undefined || underlyingContract == null) {
        return convertTokenToBUSD(value, contract);
    }

    /** calculatePrice: IN WEI */
    const priceInUnderlying: BigNumber = await contract.calculatePrice();
    const valueInUnderlying = priceInUnderlying.mul(value).div(ethers.utils.parseEther("1"));

    /** in wei */
    // const valueInBUSD = await convertTokenToBUSD(valueInUnderlying, underlyingContract)
    
    return convertTokenToBUSD(valueInUnderlying, underlyingContract);
}

export async function simplePriceTokenInToken(value: BigNumber, token0: Contract, token1: Contract) {

    if (!value || !token0 || !token1) {
        return wrap('1', 0);
    }
    const liquidityPool: string = await pancakeFactory.getPair(token0.address, token1.address)

    const [balOne, balTwo] = await Promise.all([
        token0.balanceOf(liquidityPool),
        token1.balanceOf(liquidityPool)
    ])

    return balOne.eq(0) ? ethers.utils.parseUnits("1", 0) : value.mul(balTwo).div(balOne);

}

export async function getAmountsOut(value: BigNumber, token0: Contract, token1: Contract) {

    const out = await pancakeRouter.getAmountsOut(unwrap(value), [token0.address, token1.address]);
    // // // // console.log('PRICE OUT: ', out[0].toString(), out[1].toString());
    return out[1];
}

export async function getPriceOfTokenInToken(value: BigNumber, token0: Contract, token1: Contract) {

    if (!value || !token0 || !token1) {
        return wrap('1', 0);
    }

    const liquidityPool: string = await pancakeFactory.getPair(token0.address, token1.address)

    const [balOne, balTwo] = await Promise.all([
        token0.balanceOf(liquidityPool),
        token1.balanceOf(liquidityPool)
    ])

    const price = balOne.eq(0) ? ethers.utils.parseUnits("1", 0) : value.mul(balTwo).div(balOne);

    const k = balOne.mul(balTwo);
    const expectedRemaining = k.div(balOne.add(price))
    const actualSent = balTwo.sub(expectedRemaining)

    const impact = price.gt(actualSent) ? price.sub(actualSent) : BigNumber.from('0');

    // // // // console.log('---------PRICE OF TOKEN IN TOKEN-------------')
    // // // // console.log(value.toString(), liquidityPool, balOne.toString(), balTwo.toString())
    // // // // console.log(price.toString(), impact.toString(), actualSent.toString())

    return {
        price: wrap(price.toString(), 0),
        impact: wrap(impact.toString(), 0)
    }
}

/**
 * Converts the value into BUSD
 * @param {BigNumber} value - The value in wei format 
 * @param {Contract} contract - contract of the token to convert
 * @returns {Promise<string>}
 */
export async function convertTokenToBUSD(value: BigNumber, contract: Contract): Promise<BigNumber> {

    let valueInBNBRaw: BigNumber[];
    let bnbValue: BigNumber = contract.address === BNB.address ? value : await simplePriceTokenInToken(
        value, contract, BNBContract);

    const valueInBUSD = await simplePriceTokenInToken(bnbValue, BNBContract, BUSDContract)
    // // // // console.log('Values For: ', await contract.symbol(), 'BNB Value: ', bnbValue.toString(), 'Value: ', value.toString(), 'Token Value: ', valueInBUSD)
    return valueInBUSD;

}

/**
 * Generic function to make a call to a contract, and return the result
 * @param contract - The contract to call
 * @param functionName - The function on the contract
 * @param args - any arguments to pass to the function, as many as needed
 * @returns Promise<string> - the result from the contract function, in string form. VALUES ARE IN WEI FORMAT.
*/
export async function fetchFromContract(contract: Contract, functionName: string, ...args: any[]): Promise<string> {
    const returnedRaw = await contract.functions[functionName](...args);
    const returned = ethers.utils.formatUnits(returnedRaw, 'wei');
    return returned;
}

/**
 * Generic function to convert string to big number
 * @param value - The string value to convert
 * @returns BigNumber - the value in BigNumber format
 */
export function convertStringToBigNumber(value: string): BigNumber {
    return ethers.utils.parseUnits(value, 'wei');
}

/**
 * Generic function to convert big number to string
 * @param value - The BigNumber value to convert
 * @returns string - the value in string format
 */
export function convertBigNumberToString(value: BigNumber): string {
    return ethers.utils.formatUnits(value, 'wei');
}

/**
 * adjust the decimal place and returns a string
 * @param {number | string | BigNumber} value - The number to adjust
 * @param {number} decimals - the decimal place to adjust to
 * @returns {string}
 */
export function adjustDecimals(value: number | string | BigNumber, decimals: number): string {
    return (decimals < 0) ? ethers.utils.formatUnits(`${value}`, Math.abs(decimals)) : ethers.utils.parseUnits(`${value}`, decimals).toString()
}

/**
 * wrapper function to convert a string to a BigNumber and removes any decimals
 * @param {string} value - The number to adjust
 * @param {number} decimals - the decimal place to adjust to (18-9)
 * @returns {BigNumber}
 */
export function wrap(value: string, decimals: number = 18): BigNumber {
    if (!value) {
        // // // console.log('Value Undefined');
        return BigNumber.from('1');
    }
    if (contains(value, 'e')) {
        // // // console.log('Invalid String To Wrap: ', value);
        return BigNumber.from('0');
    }
    //// // console.log('wrap', value, decimals);
    return ethers.utils.parseUnits(`${value}`, 18 - decimals)
}

export function contains(str: string, target: string): boolean {
    if (!str) return false;
    if (str.length === 0) return false;

    for (let i = 0; i < str.length; i++) {
        if (str[i] == target) {
            // // // // console.log('Caught: ', target, ' In: ', str);
            return true;
        }
    }
    return false;
}

/**
 * wrapper function to convert a BigNumber to a string and adds decimals if present
 * @param {BigNumber} value - The number to adjust
 * @returns {string} 
 */
export function unwrap(value: BigNumber): string {
    return ethers.utils.formatEther(value)
}

/**
 * function to get approval for the contract to spend the tokens
 * @param {Contract} tokenContract - contract of token for which the approval is needed
 * @param {String} spender - address of the spender
 * @returns {boolean}
 */
export async function approveOld(tokenContract: Contract, spender: string, amount: BigNumber = MaxSafeInteger()): Promise<any> {
    const retVal = await tokenContract.approve(spender, amount.toString())
    return retVal
}
export async function approve(enqueueSnackbar, tokenContract: Contract, spender: Contract, amount: BigNumber = MaxSafeInteger()): Promise<any> {
    
    const pendingMsg = `pending approval of ${tokenContract.symbol} for ${spender.name}`
    const successMsg = `Successfully approved of ${tokenContract.symbol} for ${spender.name}`
    const errorMsg = `Error approving of ${tokenContract.symbol} for ${spender.name}`

    const tx:Promise<TransactionResponse> = tokenContract.approve(spender.address, ethers.constants.MaxUint256)
    await TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
    // const retVal = await tokenContract.approve(spender, amount.toString())
    // return retVal
}

        // WRAPPING = CONVERT NUMBER OR INT INTO A BIGNUMBER WITH NO DECIMALS
// XUSD:    18 decimals     123111000222000333000 * 10^(18 - decimals)  => 123111000222000333000 BIGNUMBER NO DECIMALS
// Useless: 9 decimals      105111000222                                => 105111000222000000000 BIGNUMBER NO DECIMALS
// SADA:    0 decimals      110                                         => 110000000000000000000 BIGNUMBER NO DECIMALS

        // UN-WRAPPING = CONVERT BIGNUMBER INTO STRING WITH DECIMALS
// XUSD:    18 decimals     123.111000222000333000 / 10^(18)            => 123.111000222000333000 STRING WITH DECIMALS
// Useless: 9 decimals      105.111000222                               => 105.111000222000000000 STRING WITH DECIMALS
// SADA:    0 decimals      110                                         => 110.000000000000000000 STRING WITH DECIMALS


// We want: Number with 0 decimal points, that we can convert into desired number with decimal points



// tokenQTYRaw * 10^18 / 10^decimals     =>   10^(18 decimals)



/**
 * function to get approval for the contract to spend the tokens
 * @param {Contract} tokenContract - contract for which the approval was asked
 * @param {String} owner - address of the owner
 * @param {String} spender - address of the spender
 * @param {number} decimals - amount of decimals
 * @returns {BigNumber}  - allowance of spender from owner wrapped in TokenContract's decimals
 */
export async function allowance(tokenContract: Contract, owner: String, spender: String, decimals: number) {
    if (tokenContract === undefined || owner === undefined || spender === undefined || decimals === undefined) {
        return wrap('1', 18);
    }

    const retVal = await tokenContract.allowance(owner, spender);
    if (decimals < 0) {
        decimals = await tokenContract.decimals()
    }
    return wrap(retVal, decimals)
}

/**
 * function to determine if Approval is required for a transaction to succeed
 * @Param {BigNumber} balance - number of tokens spender is trying to move from owner
 * @param {Contract} tokenContract - contract for which the approval was asked
 * @param {String} owner - address of the owner
 * @param {String} spender - address of the spender
 * @returns {BigNumber}
 */
export function isApprovalRequired(tokenContract: Contract, owner: String, spender: String, decimals: number): boolean {
    
    const allowanceNeeded = BigNumber.from(10).pow(BigNumber.from(30))
    allowance(tokenContract, owner, spender, decimals).then((allowance_) => {
        return parseFloat(unwrap(allowance_)) <= parseFloat(unwrap(allowanceNeeded));
    }).catch(() => {
        return false
    })
    return false
}

/** 
 * formats a stringified number to a number spearated by commas with a decimal place cutoff
 * @param text - the string to format
 * @param decimals - the decimal place to adjust to
 * @returns stringified number with commas
 */
export function formatStringWithCommas(text: string, desiredDecimals: number = 2): string {
    if (typeof text != 'string') {
        return '0.00'
    }
    const reversedArray = text.split('.')[0].split('').reverse();
    const reversedComma = reversedArray.map((item, index) => {
        return (index % 3 === 0 && index > 0) ? item + ',' : item;
    })
    let decimals = text.split('.')[1] ? `.${text.split('.')[1].slice(0, desiredDecimals)}` : '';
    return reversedComma.reverse().join('').concat(decimals);
}

/**
 * returns solidity's max safe integer
 * @returns {BigNumber} the max safe int (2 * 10^53 - 1)
 */
export function MaxSafeInteger(): BigNumber {
    return ethers.constants.MaxUint256;
}

/**
 * @param {number} blocks - blocks as duration from now
 * @returns {string} - human readable format of duration of blocks from now
 */
export function convertBlocksToTime(blocks: number) :string {
    if(blocks == 0){
        return "now"
    }
    const seconds = blocks*3

    return moment.duration(seconds, "seconds").humanize(true)
}

export function mathFloor(value: string | number, decimals: number) {
    const val = typeof value == 'string' ? parseFloat(value) : value;
    return (Math.floor(val * Math.pow(10, decimals)) / Math.pow(10, decimals)).toString()
}
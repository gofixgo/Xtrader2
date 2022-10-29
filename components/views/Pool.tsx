import { Typography, Button, FormControl, Stack, TextField, Slider, Grid, Collapse, ListItemButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, CircularProgress, InputLabel, Select, MenuItem } from "@mui/material";
import {  formatStringWithCommas, TxHandler, convertBlocksToTime } from "../core/Utils";
import { IPoolData } from "../core/Interfaces";
import { XUSD_MAXI, xUSDV2, XUSDEARN, standardABI } from "../wallet/Contracts";
import { ethers } from "ethers";
import { useSnackbar } from 'notistack';
import { useWeb3React } from "@web3-react/core";
import React, { useState } from "react";
import { useGlobalState } from "../core/StateManager";
import { TransactionResponse, TransactionReceipt } from "@ethersproject/providers";


export default function Pool() {
    const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();
	const [rerun, setRerun] = useGlobalState('rerun');
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    
    const totalValueLocked = '1000000';
    // state for pooldata
    // const [poolData, setPoolData] = useGlobalState('poolData');
    const [pools, setPools] = useGlobalState('pools');
    const [BNBbalance, setBNBbalance] = useGlobalState('BNBbalance');
    const [XUSDData, setXUSDData] = useGlobalState('XUSDData');
    
    const [tabValue, setTabValue] = useGlobalState('tabValue');
    const [cardType, setCardType] = useGlobalState('swapCardType');

    // const [poolData, setPoolData] = useState<IPoolData>(null);
    // used for collapse toggle
    const [toggleByKey, setToggleByKey] = React.useState(null);

    // Unstake Slider Values
    const [unstakeSliderVal, setUnstakeSliderVal] = React.useState(0);
    const [unstakeValue, setUnstakeValue] = React.useState('0');

    // BNB Slider Values
    const [BNBsliderVal, setBNBsliderVal] = React.useState(0);
    const [BNBInput, setBNBInput] = React.useState('0');

    // XUSD Slider Values
    const [XUSDsliderVal, setXUSDsliderVal] = React.useState(0);
    const [XUSDInput, setXUSDInput] = React.useState('0');

    // XUSDEARN change reward input
    const [tokenAddress, setTokenAddress] = React.useState('');
    const [tokenInputName, setTokenInputName] = React.useState('None');
    
    // Error In Component State
    const [isError, setError] = React.useState(false);

    // Unstake Dialogue
    const [confirmUnstakeDialoOpen, setConfirmUnstakeDialoOpen] = React.useState(false);

    // Dex List
    const [dexAddress, setDexAddress] = useState('0x10ED43C718714eb63d5aA57B78B54704E256024E')
    const dexList = [
        {name: 'PancakeSwap', address: '0x10ED43C718714eb63d5aA57B78B54704E256024E'},
        {name: 'BiSwap', address: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8'},
        {name: 'ApeSwap', address: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7'},
        {name: 'BabySwap', address: '0x8317c460C22A9958c27b4B6403b98d2Ef4E2ad32'},
        {name: 'SFMSwap', address: '0x37da632c6436137BD4D0CA30c98d3c615974120b'}
    ]

    const click = () => {
        // console.log('click')
    }
    
    const forceUpdate: () => void = React.useState()[1].bind(null, {})

    const confirmUnstakeDialog = (pool: IPoolData) => {
		return (
			<Dialog
				open={confirmUnstakeDialoOpen}
				onClose={() => { setConfirmUnstakeDialoOpen(false) }}
				aria-labelledby="alert-dialog-title"
				aria-describedby="alert-dialog-description"
			>
				<DialogTitle id="alert-dialog-title">
					{"Early Unstaking Confirmation"}
				</DialogTitle>
				<DialogContent>
					<DialogContentText id="alert-dialog-description">
						A {pool.leaveEarlyFee}% early unstake fee will be added if unstaked before the 5 day lock time.<br />
						This lock period will end {convertBlocksToTime(pool.unstakeTimeBlocks)}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => { setConfirmUnstakeDialoOpen(false) }}>Disagree</Button>
					<Button onClick={() => {
                        console.debug('withdrawXUSD', pool)
						withdrawXUSD(pool)
						setConfirmUnstakeDialoOpen(false)
					}}>
						Agree
					</Button>
				</DialogActions>
			</Dialog>
		)
	}

    const stakeInXUSD = async (index, pool: IPoolData) => {
        const pendingMsg = `pending staking ${XUSDInput} XUSD in ${pool.poolName}`
        const successMsg = `Successfully staked ${XUSDInput} XUSD in ${pool.poolName}`
        const errorMsg = `Error staking ${XUSDInput} XUSD in ${pool.poolName}`
        // console.log('stakeInXUSD', XUSDInput)

        if (index == 0) {
            const tx:Promise<TransactionResponse> = pool.StakingContract.deposit(ethers.utils.parseEther(XUSDInput))
            await TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
        } else {
            const tx:Promise<TransactionResponse> = pool.StakingContract.stake(ethers.utils.parseEther(XUSDInput))
            await TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
        }

        // console.log('Stake In XUSD');
    }

    const withdrawXUSD = async (pool: IPoolData) => {
        const pendingMsg = `pending withdrawing ${formatStringWithCommas(unstakeValue, 4)} XUSD from ${pool.poolName}`
        const successMsg = `Successfully withdrew ${formatStringWithCommas(unstakeValue, 4)} XUSD from ${pool.poolName}`
        const errorMsg = `Error withdrawing ${formatStringWithCommas(unstakeValue, 4)} XUSD from ${pool.poolName}`
        
        // const tx:Promise<TransactionResponse> = pool.StakingContract.withdraw(ethers.utils.parseEther(unstakeValue))
        const tx:Promise<TransactionResponse> = pool.StakingContract["withdraw(uint256)"](ethers.utils.parseEther(unstakeValue))
        await TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
        // console.log('Withdraw XUSD');
    }

    const stakeWithBNB = async (index, pool: IPoolData) => {
        const pendingMsg = `pending staking ${BNBInput} BNB in ${pool.poolName}`
        const successMsg = `Successfully staked ${BNBInput} BNB in ${pool.poolName}`
        const errorMsg = `Error staking ${BNBInput} BNB in ${pool.poolName}`
        const _to = index == 0 ? XUSD_MAXI.address : XUSDEARN.address
        let txParams = {
            // from: account,
            to: _to,
            value: ethers.utils.parseUnits(`${BNBInput}`, 'ether')
            // gasLimit: 500000,
            // gasPrice: ethers.utils.parseUnits(`${5}`, 9)
          }
        const tx:Promise<TransactionResponse> = library.getSigner().sendTransaction(txParams)
        await TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
        // send BNB to maxi contract
        // console.log('Staked With BNB');
    }

    const callApprove = async (pool: IPoolData) => {
        const pendingMsg = `pending approval of XUSD for ${pool.poolName}`
        const successMsg = `Successfully approved XUSD for ${pool.poolName}`
        const errorMsg = `Error approving XUSD for ${pool.poolName}`
        const tx:Promise<TransactionResponse> = XUSDData.Contract.approve(pool.StakingContract.address, ethers.constants.MaxUint256)
        await TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);

        // console.log('Approve Called');
    }

    const handleConfirmUnstakeDialog = (pool: IPoolData, trueOrFalse: boolean) => {
        // console.log('confirm unstake dialog');
        if(trueOrFalse) {
            confirmUnstakeDialog(pool)
        }
    }

    const setBNBSliderValue = (newValue: number) => {
        setBNBsliderVal(newValue);
        setError(false);
    }

    const setXUSDSliderValue = (newValue: number) => {
        setXUSDsliderVal(newValue)
        setError(false);
    }

    const setUnstakeSliderValue = (newValue: number) => {
        setUnstakeSliderVal(newValue)
        setError(false);
    }

    const handleBNBInputChange = (newValue: string) => {

		if (newValue === undefined || newValue === "") {
			setBNBInput('0')
			return;
		} else if (newValue === '') return;

		setBNBInput(newValue);

		// validate only one decimal point in string
		const numberOfDots = Array.from(newValue).reduce((total, char) => {
			total = (char == '.') ? total + 1 : 0;
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
		}
	}

    const handleXUSDInputChange = (newValue: string) => {

		if (newValue === undefined || newValue === "") {
			setXUSDInput('0')
			return;
		} else if (newValue === '') return;

		setXUSDInput(newValue);

		// validate only one decimal point in string
		const numberOfDots = Array.from(newValue).reduce((total, char) => {
			total = (char == '.') ? total + 1 : 0;
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
		}
	}

    const handleUnstakeClick = (pool: IPoolData) => {
        // console.log(pool);
        if (pool.unstakeTimeBlocks <= 0) {  // where is this coming from?
            withdrawXUSD(pool)
        } else {
            setConfirmUnstakeDialoOpen(true);
            handleConfirmUnstakeDialog(pool, true);
        }
    }
    const handleChangeTokenRewardClick = async (pool: IPoolData) => {

        const pendingMsg = `pending msg for ${pool.poolName}`
        const successMsg = `Success msg for ${pool.poolName}`
        const errorMsg = `Error msg for ${pool.poolName}`
        const tx:Promise<TransactionResponse> = pool.StakingContract.setRewardToken(tokenAddress, dexAddress)
        await TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);
        // console.log(pool);
    }

    const handleUnstakeSlider = (event: Event, newValue: number) => {
		setUnstakeSliderValue(newValue)
	}

    const checkIfLPExists = () => {

        if (tokenAddress.length !== 42) {
            return
        }

        const WETH = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

        // put try catch around all this

        // instantiate factory (router call)
        // const factory = dexAddress.factory()

        // get pair for BNB + Input Token
        //const pair = factory.getPair(tokenAddress, WETH)
        
        // if returns an address that is not 0, there is an LP and the Token / DEX so we're good
        // if returns undefined or 0 or throws exception, there is no LP for tokenAddress/BNB on specified DEX
    }

    const handleTokenRewardInputChange = (newValue: string) => {
        if (newValue.length !== 42) {
            // console.log('Must be 42 Characters')
            setTokenAddress(newValue)
            setTokenInputName('None')
            return
        }

        // this is not necesary because this is already done with .getAddress()
        // regex token validation
        // if (!newValue.match(/0x[a-fA-F0-9]{40}/g)) {
        //     // console.log('Must Enter Hexadecimal Value')
        //     setTokenInputName('Invalid Token')
        //     return
        // }

		setTokenAddress(newValue)
        try {
            const address = ethers.utils.getAddress(newValue)
            // create Contract from address to test if it actually is a contract
            const contract = new ethers.Contract(address, standardABI, library.getSigner())
            const name = contract.name().then(name => {
                setTokenInputName(name)
                // console.debug(`contract name: ${name} ${name.includes("function (...args)")} ${contract.symbol}`)
            }
            ).catch(err => {
                console.error(err)
                setTokenInputName('Invalid Token')
            })
        } catch (error) {
            console.error(error)
            setTokenInputName('Invalid Token')
        }
	}

    const displayChangeTokenReward = (index: number, pool : IPoolData) => {
        if (index == 0) {
            return(<></>)
        }
        return (
            <Grid item className="p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700 mb-4" alignItems="center" justifyContent={{ xs: 'left', sm: 'center' }} xs={12} sm={12} md={5.75}>
                <Stack spacing={2} >
                    <Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='0.25rem'>Change Reward Token</Typography>
                        <TextField
                            label={`Input Token: ${tokenInputName}`}
                            variant="outlined"
                            size="small"
                            value={tokenAddress}
                            color={isError ? "error" : "info"}
                            onChange={(e) => handleTokenRewardInputChange(e.target.value)} />
                        <TextField
                            label="Exchange"
                            variant="outlined"
                            select
                            value={dexAddress}
                            onChange={(e) => setDexAddress(e.target.value)}
                            defaultValue={dexList[0].address}
                            >
                            {dexList.map((dex, index) => {
                                return (<MenuItem key={index} value={dex.address}>{dex.name}</MenuItem>)
                            })}
                            
                            </TextField>
                    <Button variant="outlined" color="primary" disabled={tokenInputName === 'Invalid Token' || tokenInputName === 'None'} onClick={() => { handleChangeTokenRewardClick(pool)}}>Change Reward Token</Button>
                </Stack>
            </Grid>

        )
    }
    const displayWithdrawXUSD = (index: number, pool : IPoolData) => {
		if (parseFloat(pool?.poolBalanceOfUser?.XUSD) > 0) {
			return (
				<Grid item className="p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700 mb-4" alignItems="center" justifyContent={{ xs: 'left', sm: 'center' }} xs={12} sm={12} md={5.75}>
                    <Stack spacing={1} >
                        <Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='0.25rem'>Withdraw XUSD</Typography>
                        <Grid container>
                            <Grid item xs={12}>
                                {/* <Typography textAlign="center" variant="h5" color='#fff' marginBottom='1rem'>{pool.name}</Typography> */}
                                <Typography textAlign="center" variant="body1" color='#fff' marginBottom='0.25rem'>{formatStringWithCommas(pool.poolBalanceOfUser.XUSD, 4)} XUSD</Typography>
                            </Grid>
                        </Grid>
                        <FormControl>
                            <Slider className="w-11/12 align-middle mx-auto block py-6"
                                key={"slider-unstake"}
                                aria-label="Temperature"
                                value={unstakeSliderVal}
                                onChange={handleUnstakeSlider}
                                onChangeCommitted={() => {
                                    const x = unstakeSliderVal == 100 ? 0.000000000001 : 0;
                                    if (index === 0) {
                                        setUnstakeValue((parseFloat(pool.poolBalanceOfUser.USD) * (unstakeSliderVal / 100) - x).toString())
                                    } else {
                                        setUnstakeValue((parseFloat(pool.poolBalanceOfUser.XUSD) * (unstakeSliderVal / 100) - x).toString())
                                    }
                                }}
                                valueLabelDisplay="auto"
                                step={1}
                                marks
                                min={0}
                                max={100}
                            />
                        </FormControl>
                        <Grid item xs={12}>
                            <Grid item>
                                <Typography textAlign="center" variant="body1" color='#fff' marginBottom='1rem'>{formatStringWithCommas((parseFloat(pool.poolBalanceOfUser.XUSD) * (unstakeSliderVal / 100)).toString(), 4)}</Typography>
                            </Grid>
                        </Grid>
                        <Button variant="outlined" color="primary" disabled={(unstakeSliderVal === 0)} onClick={() => { handleUnstakeClick(pool)}}>Unstake</Button>
                        {confirmUnstakeDialog(pool)}
                    </Stack>
				</Grid>
			)
		}
	}

    const displayStakeUsingBNB = (index, pool: IPoolData) => {
        if (index > 0) {
            return (<></>)
        }
		return (
            <Grid className="max-h-full p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700 mb-4" alignItems="center" justifyContent={{ xs: 'right', sm: 'center' }} xs={12} sm={12} md={5.75}>
                <Stack className="h-full" spacing={2} >
                    <Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='1rem'>Stake Using BNB</Typography>
                    <Grid xs={12} justifyContent="center">
                        <Typography className="mb-1" textAlign='center' variant="body2" color='#ffffff'>Balance: {formatStringWithCommas(BNBbalance.toString(), 5)} BNB</Typography>
                        <FormControl fullWidth>
                            <TextField className="w-11/12 mx-auto"
                                value={BNBInput}
                                color={isError ? "error" : "info"}
                                onChange={(e) => handleBNBInputChange(e.target.value)}
                                inputProps={{
                                    style: {
                                        padding: 10
                                    }
                                }} />
                        </FormControl>
                        <Slider className="w-11/12 align-middle mx-auto block py-6"
                            key={"slider-buywithBNB"}
                            aria-label="Temperature"
                            valueLabelDisplay="auto"
                            value={BNBsliderVal}
                            onChange={(event: Event, newValue: number) => {
                                setBNBSliderValue(newValue)
                            }}
                            onChangeCommitted={() => {
                                const x = BNBsliderVal == 100 ? 0.004 : 0;
                                setBNBInput((BNBbalance * (BNBsliderVal / 100) - x).toString())
                            }}
                            step={1}
                            marks
                            min={0}
                            max={100}
                        />
                    </Grid>
                    <Button  disabled={isError} variant="outlined" color="primary" onClick={() => stakeWithBNB(index, pool)}> Convert And Stake</Button>
                </Stack>
            </Grid>
		)
	}

    const displayStakeUsingXUSD = (index: number, pool: IPoolData) => {
		return (
			<Grid className="max-h-full p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700 mb-4" alignItems="center" justifyContent={{ xs: 'left', sm: 'center' }} xs={12} sm={12} md={5.75}>
				<Stack className="h-full" spacing={6} >
					<Stack className="h-full" spacing={2} >
						<Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='1rem'>Stake Using XUSD</Typography>
						{/* <Grid item xs={12} justifyContent="center">
							<Typography className="mb-1" textAlign='center' variant="body2" color='#ffffff'>XUSD Balance: {formatStringWithCommas(pool.XUSDBalanceOfUser, 4)}</Typography>
						</Grid> */}
                        <Grid xs={12} justifyContent="center">
                            <Typography className="mb-1" textAlign='center' variant="body2" color='#ffffff'>Balance: {formatStringWithCommas(XUSDData.userXUSDBalance, 4)} XUSD</Typography>
                            <FormControl fullWidth>
                                <TextField className="w-11/12 mx-auto"
                                    value={XUSDInput}
                                    color={isError ? "error" : "info"}
                                    onChange={(e) => handleXUSDInputChange(e.target.value)}
                                    inputProps={{
                                        style: {
                                            padding: 10
                                        }
                                    }} />
                            </FormControl>
                            <Slider className="w-11/12 align-middle mx-auto block py-6"
                                key={"slider-buywithBNB"}
                                aria-label="Temperature"
                                valueLabelDisplay="auto"
                                value={XUSDsliderVal}
                                onChange={(event: Event, newValue: number) => {
                                    setXUSDSliderValue(newValue)
                                }}
                                onChangeCommitted={() => {
                                    const x = XUSDsliderVal == 100 ? 0.000000000001 : 0;
                                    setXUSDInput((parseFloat(XUSDData.userXUSDBalance) * (XUSDsliderVal / 100) - x).toString())
                                }}
                                step={1}
                                marks
                                min={0}
                                max={100}
                            />
                        </Grid>
						<Stack direction={"column"} justifyContent="flex-end">
							{displayButtonsForStakeUsingXUSD(index, pool)}
						</Stack>
					</Stack>
				</Stack>
			</Grid>
		)
	}
    
    const displayButtonsForStakeUsingXUSD = (index, pool : IPoolData) => {
        

		if (parseFloat(XUSDData.userXUSDBalance) <= 0.00001) {

			return (
				<Button className="mt-auto" variant="outlined" color="primary"
					onClick={() => {
                        // console.log('clicked')
                        setTabValue(1)
                        setCardType(0)
					}}>Click To Get XUSD</Button>
			);

		} else {

			if (pool.approvalNeeded) {
				return (
					<Grid xs={12} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
						<Button className="mt-0" variant="outlined" color="primary" onClick={() => {
							callApprove(pool)
						}}>Enable XUSD</Button>
						<Button className="mt-0" variant="outlined" color="primary"
							disabled={true}
							onClick={() => {
								stakeInXUSD(index, pool)
							}}>Stake XUSD</Button>
					</Grid>
				);
			} else {
				return (
					<Button className="mt-auto" variant="outlined" color="primary"
						disabled={pool.approvalNeeded}
						onClick={() => {
							stakeInXUSD(index, pool)
						}} >Stake XUSD</Button>
				);
			}


		}
	}

    const displayRewardsClaimPage = (index: number, pool : IPoolData) => {
        if (index == 0) {
            return(<></>)
        }
		if (parseFloat(pool?.poolBalanceOfUser?.XUSD) > 0) {
			return (
				<Grid item className="p-8 max-w-sm mx-auto my-0 rounded-md border-2 border-gray-700 mb-4" alignItems="center" justifyContent={{ xs: 'left', sm: 'center' }} xs={12} sm={12} md={5.75}>
                   <Stack spacing={1} >
                        <Typography textAlign="center" variant="h5" color='#2299ff' marginBottom='0.25rem'>Claim Rewards</Typography>
                        <Grid item xs={12}>
                            <Grid item>
                                <Typography textAlign="center" variant="body1" color='#fff' marginBottom='1rem'>{formatStringWithCommas(pool.pendingRewards.toString(), 5)} {pool.rewardToken}</Typography>
                                <Typography textAlign="center" variant="body2" color='#0f0' marginBottom='1rem'>${formatStringWithCommas(pool.rewardPrice.toString(), 2)}</Typography>
                            </Grid>
                        </Grid>
                        <Button variant="outlined" color="primary" disabled={(parseFloat(pool.pendingRewards) == 0)} onClick={() => { handleClaimRewards(pool)}}>Claim</Button>
                    </Stack>
				</Grid>
			)
		}
	}

    const handleClaimRewards = async (pool: IPoolData) => {
        // console.log('Claim Rewards');

        const pendingMsg = `pending claim rewards`
        const successMsg = `Successfully claimed rewards`
        const errorMsg = `Error claiming rewards`

        const tx:Promise<TransactionResponse> = pool.StakingContract.claimRewards()
        await TxHandler(enqueueSnackbar, tx, pendingMsg, successMsg, errorMsg);

    }

    React.useEffect(() => {
		setRerun(true)
		// eslint-disable-next-line react-hooks/exhaustive-deps		
	}, [])
	React.useEffect(() => {
        // fetchPoolData();
        forceUpdate();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rerun])

    const displayPoolTab = (pool, index) => {
		const USDValueForUser   = pool?.poolBalanceOfUser?.USD;
        const XUSDPrice         = XUSDData?.Price;
		const totalLiquidity    = pool?.totalLiquidity;
        const overallProfit     = index == 0 ? pool?.overallProfit?.USD : pool?.overallProfit?.XUSD;
        const XUSDBalanceOfUser = XUSDData?.userXUSDBalance;
        const approvalNeeded    = pool?.approvalNeeded;
		const rewardString      = pool?.rewardToken;
		const poolName          = pool?.poolName;
        const APR               = pool?.APR;
        const currentReturnString = index == 0 ? 'Current APY' : 'Current APR'
        const profitString      = index == 0 ? 'Profit' : 'Earned'
        const profitStartString = index == 0 ? '$' : ''
        const profitEndString   = index == 0 ? '' : ' BNB'
        const formatEnding      = index == 0 ? 2 : 4

		return (
			<>{
                (<Stack spacing={3}>
                    {pool != undefined ? (
                        <>
                            <ListItemButton sx={{ backgroundColor: '#21bbb10d' }} key={parseFloat(index)}
                                onClick={() => { setToggleByKey((toggleByKey == null || toggleByKey != index) ? index : null) }}>
                                <Grid className="items-start sm:items-center" key={index} container xs={12}>
                                    <Grid justifyContent="center" alignItems="center" item xs={6} sm={2} id="names">
                                                <Typography className="text-center" variant="subtitle1">{poolName}</Typography>
                                                { index == 1 ? <Typography className="text-center" color='#00dd00' variant="body2">Earning {rewardString}</Typography> : <></>}
                                        {/* <Typography className="pl-2" variant="h6">{`${farm?.name}`}</Typography> */}
                                    </Grid>

                                    <Grid alignItems="center" justifyContent={{ xs: 'right', sm: 'center' }} item xs={6} id="APR">
                                        <Stack alignItems="center">
                                            <Typography variant="body2" style={{ fontStyle: 'italic' }}>{currentReturnString}</Typography>
                                            <Typography variant="body2" style={{ fontStyle: 'italic' }}>{APR}</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid alignItems="center" container xs={12} sm={4} id="details">
                                        <Grid className="sm:pt-0 pt-2" container xs={4} sm={12}>
                                            <Grid item xs={12} sm={6}><Typography className="text-center sm:text-left font-bold sm:font-normal" variant="body2">{profitString}</Typography></Grid>
                                            <Grid item xs={12} sm={6}><Typography className="text-center sm:text-right" variant="body2">{profitStartString}{formatStringWithCommas(overallProfit, formatEnding)}{profitEndString}</Typography></Grid>
                                        </Grid>
                                        <Grid className="sm:pt-0 pt-2" container xs={4} sm={12}>
                                            <Grid item xs={12} sm={6}><Typography className="text-center sm:text-left font-bold sm:font-normal" variant="body2">Balance</Typography></Grid>
                                            <Grid item xs={12} sm={6}><Typography className="text-center sm:text-right" variant="body2">${
                                                formatStringWithCommas(USDValueForUser, 2)}</Typography></Grid>
                                        </Grid>
                                        <Grid className="sm:pt-0 pt-2" container xs={4} sm={12}>
                                            <Grid item xs={12} sm={6}><Typography className="text-center sm:text-left font-bold sm:font-normal" variant="body2">TVL</Typography></Grid>
                                            <Grid item xs={12} sm={6}><Typography className="text-center sm:text-right" variant="body2">${
                                                formatStringWithCommas(totalLiquidity, 2)
                                            }</Typography></Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </ListItemButton>
                            <Collapse in={toggleByKey === index} timeout="auto" unmountOnExit>
                                    <>
                                        <Grid className="max-w-4xl mx-auto my-0" container xs={12} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                            {displayStakeUsingXUSD(index, pool)}
                                            {displayStakeUsingBNB(index, pool)}
                                            {displayWithdrawXUSD(index, pool)}
                                            {displayChangeTokenReward(index, pool)}
                                            {displayRewardsClaimPage(index, pool)}
                                        </Grid>
                                    </>
                            </Collapse>
                        </>
                    ) : (<Stack direction="row" justifyContent="space-evenly">
                        <CircularProgress/>
                    </Stack>)}
                </Stack>)}</>
		)
	}



    return (
        <>
        <Stack spacing={2}>
            <Stack>
                {displayPoolTab(pools[0], 0)}
            </Stack>
            <Stack>
                {displayPoolTab(pools[1], 1)}
            </Stack>        
        </Stack>
        </>
    )
}

import { useWeb3React } from "@web3-react/core";
import { Contract, ethers, BigNumber } from "ethers";
import React from "react";
import { useGlobalState } from "../core/StateManager";
import { BNB, CAKE, cake_loan_oracle, cake_loan, treasury, strategy } from "../wallet/Contracts";

import {
    Box, Card, Tab, Tabs, CardContent, Toolbar, Stack, Typography, Divider, Grid, TextField,
    Select, MenuItem, SelectChangeEvent, Button, Slider, CircularProgress
} from "@mui/material";
import { useSnackbar } from 'notistack';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { formatStringWithCommas, adjustDecimals, MaxSafeInteger, wrap, priceOf } from "../core/Utils";

export default function Contribute() {
    const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();
    const [rerun, setRerun] = useGlobalState('rerun');
    const [cakeLoanBalance, setCakeLoanBalance] = React.useState('0');
    const [cakeBalance, setCakeBalance] = React.useState('0');
    const [dailyRate, setDailyRate] = React.useState('0');
    const [loanedAmount, setLoanedAmount] = React.useState('0');
    const [isApproved, setIsApproved] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isUnstaking, setIsUnstaking] = React.useState(false);
    const [cakePrice, setCakePrice] = React.useState('0');
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const [contribValue, setContribValue] = React.useState(0)
    const [cakeInput, setCakeInput] = React.useState('0')

    const [unstakeValue, setUnstakeValue] = React.useState(0)
    const [cakeOutput, setCakeOutput] = React.useState('0')


    const getCakeLoanBalance = async () => {
        const cakeLoanContract = new Contract(cake_loan.address, cake_loan.abi, library.getSigner());
        const cakeLoanValueRaw = await cakeLoanContract.totalValueLocked()
        return ethers.utils.formatEther(cakeLoanValueRaw);
    }

    const getDailyRate = async () => {
        const cakeLoanOracleContract = new Contract(cake_loan_oracle.address, cake_loan_oracle.abi, library.getSigner());
        const dailyRewardsRaw = await cakeLoanOracleContract.getDailyRate();
        return adjustDecimals(dailyRewardsRaw, -36);
    }

    const getUserCakeBalance = async () => {
        const cakeContract = new Contract(CAKE.address, CAKE.abi, library.getSigner());
        const userCakeBalanceRaw = await cakeContract.balanceOf(account);
        return ethers.utils.formatEther(userCakeBalanceRaw);
    }

    const getApprovalStatus = async () => {
        const cakeContract = new Contract(CAKE.address, CAKE.abi, library.getSigner());
        const balance = await cakeContract.balanceOf(account);
        const allowance = await cakeContract.allowance(account, cake_loan.address);
        if (allowance.gte(balance)) {
            return true;
        } else {
            return false;
        }
    }

    const getLoanedCakeBalance = async () => {
        const cakeLoanContract = new Contract(cake_loan.address, cake_loan.abi, library.getSigner());
        const cakeLoanedRaw = await cakeLoanContract.stakedAmount(account);
        return ethers.utils.formatEther(cakeLoanedRaw);
    }

    const getCakePrice = async () => {
        const cakePrice = await priceOf(CAKE.address);
        return cakePrice.formatted;
    }

    const getValues = async () => {
        let [
            _cakeLoanBalance,
            _dailyRate,
            _userCakeBalance,
            _approvalStatus,
            _loanedCakeBalance,
            _cakePrice
        ] = await Promise.all([
            getCakeLoanBalance(),
            getDailyRate(),
            getUserCakeBalance(),
            getApprovalStatus(),
            getLoanedCakeBalance(),
            getCakePrice()
        ])

        setCakeLoanBalance(_cakeLoanBalance);
        setDailyRate(_dailyRate);
        setCakeBalance(_userCakeBalance);
        setIsApproved(_approvalStatus);
        setLoanedAmount(_loanedCakeBalance);
        setCakePrice(_cakePrice);
    }

    const approveContract = async () => {
        const cakeContract = new Contract(CAKE.address, CAKE.abi, library.getSigner());
        const tx = await cakeContract.approve(cake_loan.address, MaxSafeInteger());
        setIsLoading(true);
        const reciept = await tx.wait();
        setIsLoading(false);
        if (reciept.status === 1) {
            enqueueSnackbar('Approved!', { variant: 'success' });
            setIsApproved(true);
        } else {
            enqueueSnackbar('Something happened, try again', { variant: 'error' });
        }


    }


    React.useEffect(() => {
        if (library && account) {
            getValues();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [library, rerun]);


    const stakeCake = async () => {
        const cakeLoanContract = new Contract(cake_loan.address, cake_loan.abi, library.getSigner());
        const amountBN = ethers.utils.parseEther(cakeInput);
        const tx = await cakeLoanContract.stakePortion(amountBN.sub(ethers.utils.parseEther('0.0001')), {
            gasLimit: 500000
        });
        setIsLoading(true);
        const reciept = await tx.wait();
        setIsLoading(false);
        if (reciept.status === 1) {
            enqueueSnackbar('Thank you for your contribution!', { variant: 'success' });
        } else {
            enqueueSnackbar('Something happened, try again', { variant: 'error' });
        }
    }

    const unstakeCake = async () => {
        const cakeLoanContract = new Contract(cake_loan.address, cake_loan.abi, library.getSigner());
        const amountBN = ethers.utils.parseEther(cakeOutput);
        let tx = (unstakeValue == 100) ? await cakeLoanContract.withdrawAll({
            gasLimit: 500000
        }) : await cakeLoanContract.withdrawPortion(amountBN, {
            gasLimit: 500000
        });
        setIsUnstaking(true);
        const reciept = await tx.wait();
        setIsUnstaking(false);
        if (reciept.status === 1) {
            enqueueSnackbar('CAKE Withdrawn', { variant: 'success' });
        } else {
            enqueueSnackbar('Something happened, try again', { variant: 'error' });
        }
    }



    // console.error(tokensList);
    const renderTab = () => {
        return (
            <>
                <Stack spacing={2} sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" textAlign='center' color='#21bbb1'>
                        Contribute To The Treasury
                    </Typography>
                    <Typography variant="body2" textAlign='center' color='#21bbb1'>
                        Got CAKE? Love XUSD? Contribute to the Treasury and give this new utility a jump start!
                    </Typography>
                    <Typography variant="body2" textAlign='center' className="mt-0" color='#21bbb1'>
                        This will generate yield, and only the profits will be sent to the treasury.
                    </Typography>
                    <Typography variant="body2" textAlign='center' className="mt-0" color='#21bbb1'>
                        Need your CAKE? No worries, you can withdraw anytime. no questions asked, no risk of loss.
                    </Typography>
                    <br></br>
                    <Typography variant="body2" textAlign='center' className="mt-0 font-bold border border-solid border-red-700 rounded p-4" color='#FF0000'>
                        CAKE has migrated its Staking Protocol to V2, Unstake Your CAKE from The Contribution Contract Until 
                        A New Contract Is Deployed To Interact With The V2 CAKE Pool
                    </Typography>
                    <Stack alignItems="flex-start" justifyContent="space-evenly" direction="row" >
                        <Stack alignItems="center">
                            <Typography variant="h5">${formatStringWithCommas(cakeLoanBalance, 2)}</Typography>
                            <Typography style={{
                                maxWidth: '9rem',
                                textAlign: 'center',
                                lineHeight: '1.3rem',
                            }} variant="overline">Total Contributed</Typography>
                        </Stack>
                        {parseFloat(loanedAmount) > 0 ? (
                            <Stack alignItems="center">
                                <Typography style={{ color: '#21bbb1' }} variant="h5">${formatStringWithCommas(`${parseFloat(loanedAmount) * parseFloat(cakePrice)}`, 2)}</Typography>
                                <Typography style={{
                                    maxWidth: '9rem',
                                    textAlign: 'center',
                                    lineHeight: '1.3rem',
                                    color: '#21bbb1'
                                }} variant="overline">My Contribution</Typography>
                            </Stack>
                        ) : (<></>)}
                        <Stack alignItems="center">
                            <Typography variant="h5">${
                                formatStringWithCommas(`${parseFloat(dailyRate) * parseFloat(cakeLoanBalance)}`, 2)
                            }</Typography>
                            <Typography style={{
                                maxWidth: '9rem',
                                textAlign: 'center',
                                lineHeight: '1.3rem',
                            }} variant="overline">Daily Rewards Generated</Typography>
                        </Stack>
                    </Stack>
                    <Divider />

                    <Stack spacing={1}>
                        {
                            isApproved ? (
                                <Stack justifyContent="space-evenly" spacing={2} direction="row">
                                    <Stack direction="column">
                                        <Box>
                                            <Typography variant="subtitle1">
                                                Balance: {formatStringWithCommas(cakeBalance, 4)} CAKE
                                            </Typography>
                                            <Slider className="w-11/12 align-middle mx-auto block py-6"
                                                key={"slider-cake-loan"}
                                                valueLabelDisplay="auto"
                                                value={contribValue}
                                                onChange={(event: Event, newValue: number) => {
                                                    setContribValue(newValue)
                                                }}
                                                onChangeCommitted={() => {
                                                    if (contribValue > 0 && parseFloat(cakeBalance) > 0) {
                                                        setCakeInput((parseFloat(cakeBalance) * (contribValue / 100)).toString())
                                                    } else {
                                                        setCakeInput('0')
                                                    }

                                                }}
                                                step={10}
                                                marks
                                                min={0}
                                                max={100}
                                            />
                                        </Box>
                                        {/* <Button disabled={parseFloat(cakeInput) == 0} onClick={stakeCake} variant="outlined" color="primary" size="large">
                                            Stake {formatStringWithCommas(cakeInput, 4)} CAKE
                                            {isLoading ? (<CircularProgress className="relative left-2" style={{ height: '24px', width: '24px' }} />) : ''}
                                        </Button> */}
                                        <Button disabled={true} variant="outlined" color="primary" size="large">
                                            Not Available
                                        </Button>
                                    </Stack>
                                    {parseFloat(loanedAmount) > 0 ? (
                                        <Stack direction="column">
                                            <Box>
                                                <Typography variant="subtitle1">
                                                    Contributed: {formatStringWithCommas(loanedAmount, 4)} CAKE
                                                </Typography>
                                                <Slider className="w-11/12 align-middle mx-auto block py-6"
                                                    key={"slider-cake-loan"}
                                                    valueLabelDisplay="auto"
                                                    value={unstakeValue}
                                                    onChange={(event: Event, newValue: number) => {
                                                        setUnstakeValue(newValue)
                                                    }}
                                                    onChangeCommitted={() => {
                                                        if (unstakeValue > 0 && parseFloat(loanedAmount) > 0) {
                                                            setCakeOutput((parseFloat(loanedAmount) * (unstakeValue / 100)).toString())
                                                        } else {
                                                            setCakeOutput('0')
                                                        }

                                                    }}
                                                    step={10}
                                                    marks
                                                    min={0}
                                                    max={100}
                                                />
                                            </Box>


                                            <Button disabled={parseFloat(cakeOutput) == 0} onClick={unstakeCake} variant="outlined" color="error" size="large">
                                                Unstake {formatStringWithCommas(cakeOutput, 4)} CAKE
                                                {isUnstaking ? (<CircularProgress className="relative left-2" style={{ height: '24px', width: '24px' }} />) : ''}
                                            </Button>
                                        </Stack>
                                    ) : (<></>)}
                                </Stack>
                            ) : (
                                <Button onClick={approveContract} variant="outlined" color="primary" size="large">
                                    Approve
                                    {isLoading ? (<CircularProgress className="relative left-2" style={{ height: '24px', width: '24px' }} />) : ''}
                                </Button>
                            )
                        }

                    </Stack>
                </Stack>

            </>
        )
    }

    return (
        <Box>
            {account && library ? (
                <>
                    <Card sx={{ maxWidth: '42rem', margin: '0 auto' }}>
                        <CardContent>
                            <Stack spacing={3}>
                                {renderTab()}
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



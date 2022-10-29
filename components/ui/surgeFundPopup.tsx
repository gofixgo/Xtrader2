/**
 * read:
 *  timetillclaim ,_ secondsUntilNextClaim 
 *  claimable BNB <- usersCurrentClaim 
 * 
 *  amount user has donated <- amountUserHasDonated 
 *  
 * write:
 *  claim <- claim
 *  opt out <- optOut
 * 
 *  donate <- send BNB to address
 */
import * as React from 'react';
import { Dialog, DialogTitle, Button, Typography, Grid, DialogContent, DialogActions, Stack, Box, FormControl, Slider, TextField, Popover, Switch } from '@mui/material';
import Image from 'next/image'
import { connectors } from "../wallet/Connectors"
import { useWeb3React } from '@web3-react/core';
import { useSnackbar } from 'notistack';
import { IConnectorConfig } from '../core/Interfaces';
import PropTypes from 'prop-types';
import { useService, useIsMobile } from '../core/Service';
import { surge_fund } from "../wallet/Contracts";
import { Contract, ethers, BigNumber, utils } from "ethers";


export default function SurgeFundPopup(props) {
    const { onClose, open } = props;
    const { enqueueSnackbar } = useSnackbar();
    // const { activate } = useWeb3React();
    const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();

    const [surgefund_contract, set_surgefund_contract] = React.useState<Contract>()
    const [usersCurrentClaim, setUsersCurrentClaim] = React.useState(null)

    const [isError, setError] = React.useState(false);
    const [displayValue, setDisplayValue] = React.useState('0');
    const [donateValue, setDonateValue] = React.useState(0);
    const [optOutValue, setOptOutValue] = React.useState(0);
    const [userBalanceBNB, setUserBalanceBNB] = React.useState("0");
    const [optOutAnchor, setOptOutAnchor] = React.useState(null);
    const [donateAnchor, setDonateAnchor] = React.useState(null);
    const [isClaimTypeXUSD, setIsClaimTypeXUSD] = React.useState(false);


    const estimatedGasPrice = 0.0035;

    const isMobile = useIsMobile()

    const handleClose = () => {
        onClose();
    };
    const handleClaim = () => {
        surgefund_contract.claim().then(
            (receipt) => {
                // // // console.log('success', receipt);
                enqueueSnackbar('Claimed', { variant: 'success' });
            },
            (error) => {
                // // // console.log('success', error);
                enqueueSnackbar('Error Claiming', { variant: 'error' });
            }
        )
    }
    const handleOptOut = () => {
        surgefund_contract.optOut(optOutValue).then(
            (receipt) => {
                // // // console.log('success', receipt);
                enqueueSnackbar('Opt Out successful, Thank you!', { variant: 'success' });
            },
            (error) => {
                // // // console.log('success', error);
                enqueueSnackbar('Error Opting Out', { variant: 'error' });
            }
        )
    }

    const handleDonate = () => {
        const txParams = {
            from: account,
            to: surge_fund.address,
            value: ethers.utils.parseUnits(`${donateValue.toFixed(18)}`, 18)
        }
        library.getSigner().sendTransaction(txParams)
            .then((receipt) => {
                enqueueSnackbar('Donation successful', { variant: 'success' });
                console.error(receipt)
            }).catch((error) => {
                enqueueSnackbar('Error Donating', { variant: 'error' });
                console.error(error)
            })
    }
    const handleOptOutSliderChange = (event: any) => {
        setOptOutValue(Number(event.target.value) === 0 ? 0 : Number(event.target.value))
    }
	
    const handleSliderChange = (event: any) => {
        // // // // console.log("handleSliderChange: ", newValue, swapState.sliderValue)
        // setSwapState({ ...swapState, sliderValue: newValue });
        // // // // console.log("handleSliderChange: ", newValue, swapState.sliderValue)
        // changeSliderValue(newValue)

        const newValue = Number(event.target.value) === 0 ? 0 : Number(event.target.value)
        const percentage = newValue / 100;
        const newBuyValue = Math.min(parseFloat(userBalanceBNB) - estimatedGasPrice, parseFloat(userBalanceBNB) * percentage);

        setDisplayValue(newBuyValue.toFixed(4));
        setDonateValue(parseFloat(newBuyValue.toFixed(4)));
        setError(false);
    };

    const handleRewardType = (e) => {
        // if switch is on, set to 0
        if (e.target.checked) {
            surgefund_contract.setXUSDAsReward().then(
                (receipt) => {
                    // // // console.log('success', receipt);
                    enqueueSnackbar('XUSD set as the SurgeFund reward', { variant: 'success' });
                    setIsClaimTypeXUSD(true);
                },
                (error) => {
                    // // // console.log('success', error);
                    enqueueSnackbar('Error setting SurgeFund Reward Type', { variant: 'error' });
                }
            )
        }
        if (!e.target.checked) {
            surgefund_contract.setBUSDAsReward().then(
                (receipt) => {
                    // // // console.log('success', receipt);
                    enqueueSnackbar('BUSD set as the SurgeFund reward', { variant: 'success' });
                    setIsClaimTypeXUSD(false);
                },
                (error) => {
                    // // // console.log('success', error);
                    enqueueSnackbar('Error setting SurgeFund Reward Type', { variant: 'error' });
                }
            )
        }
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        // validate input, must be a number, not text, and not more than the balance
        const newValue = event.target.value;
        setDisplayValue(newValue);
        // // // console.log('new Value', newValue)


        // if last character is a dot
        // validate only one decimal point in string
        const numberOfDots = Array.from(newValue).reduce((total, char) => {
            total += (char == '.') ? 1 : 0;
            return total
        }, 0)
        if (numberOfDots > 1) {
            // // // console.log('dots greater than one')
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

        let newDonateBool = parseFloat(newValue) >= parseFloat(userBalanceBNB)
        if (newDonateBool) {
            setError(true);
            enqueueSnackbar('Value entered is higher than balance', { variant: 'error' });
            return
        }


        if (!Number.isNaN(parseFloat(newValue))) {
            setError(false);
            setDisplayValue(newValue);
            setDonateValue(parseFloat(newValue));
        }

    }

    React.useEffect(() => {
        if (account && library) {
            const contract = new Contract(surge_fund.address, surge_fund.abi, library.getSigner())
            set_surgefund_contract(contract)
            // // // console.log('surgefund_contract', contract)

            contract.balanceOf(account).then((claim) => {
                setUsersCurrentClaim(parseFloat(ethers.utils.formatUnits(claim, "ether")))
            })
            library.getBalance(account).then((balance) => {
                setUserBalanceBNB(parseFloat(ethers.utils.formatUnits(balance, 'ether')).toFixed(4));
            });
            contract.victims(account).then((victims) => {
                setIsClaimTypeXUSD(victims['wantsXUSD']);
                //// // console.log('isClaimTypeXUSD', isClaimTypeXUSD)
            })
            // // // // console.log(`secondsUntilNextClaim: `, secondsUntilNextClaim)
            // // // // console.log(`usersCurrentClaim: `, usersCurrentClaim)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account, library])

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle className="text-center">Surge Fund</DialogTitle>

            <DialogContent>
                <Stack spacing={4}>
                    <Typography>Surge Fund is a charitable fund created for the victims of the August 16th attack on SurgeBNB.
                        Victims of the attack can click the claim button below to claim BUSD or XUSD from the fund,
                        permitting there are funds available to claim. 
                        <br/><br/>
                        If you lost less than .1 BNB, you do not have to claim, as you will be airdropped BNB as funds become available.</Typography>
                    <Stack justifyContent="center" direction="row" spacing={2}>

                        <Stack direction="row" spacing={0} alignItems="center">
                            <Typography>BUSD</Typography>
                                <Switch checked={isClaimTypeXUSD} onChange={handleRewardType} />
                            <Typography>XUSD</Typography>
                        </Stack>

                         <Button disabled={!usersCurrentClaim && usersCurrentClaim < 0.05} variant="outlined" onClick={handleClaim}>{usersCurrentClaim && usersCurrentClaim >= 0.05? "Claim" : "Not Above Minimum Claim"} {usersCurrentClaim ? usersCurrentClaim.toLocaleString(undefined, {
                            minimumFractionDigits: 6,
                            maximumFractionDigits: 6
                        }) : ""}</Button>
                    </Stack>
                    
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color="error" onClick={(event) => {
                    setOptOutAnchor(event.currentTarget.parentNode.parentNode);
                }} >Opt Out</Button>
                <Popover
                    id="simple-popover"
                    open={Boolean(optOutAnchor)}
                    anchorEl={optOutAnchor}
                    onClose={() => {
                        setOptOutAnchor(null);
                        setOptOutValue(0);
                    }}
                    anchorOrigin={{
                        vertical: 'center',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'center',
                        horizontal: 'center',
                    }}
                >
                    <Box style={{padding: '20px 40px'}}>
                        <Typography align="center" sx={{ p: 2 }}>Are you sure you want to opt-out your {optOutValue} percentage of the Surge Fund?</Typography>
                        <Slider
                                    aria-label="Temperature"
                                    defaultValue={0}
                                    valueLabelDisplay="auto"
                                    step={1}
                                    marks
                                    onChange={handleOptOutSliderChange}
                                    min={0}
                                    max={100}
                                />
                        <Button onClick={() => {  setOptOutValue(0); setOptOutAnchor(null); }}>Cancel</Button>
                        <Button onClick={handleOptOut}>Confirm</Button>
                    </Box>
                </Popover>
                <Box className="flex-grow"></Box>
                <Button color="primary" onClick={(event) => {
                    setDonateAnchor(event.currentTarget.parentNode.parentNode);
                }}>Donate</Button>                
                <Popover
                    id="simple-popover"
                    open={Boolean(donateAnchor)}
                    anchorEl={donateAnchor}
                    onClose={() => {
                        setDonateAnchor(null);
                        setDisplayValue('0');
                    }}
                    anchorOrigin={{
                        vertical: 'center',
                        horizontal: 'center',
                    }}
                    transformOrigin={{
                        vertical: 'center',
                        horizontal: 'center',
                    }}
                >
                    <Stack style={{padding: '20px 40px'}} spacing={2}>
                        <Box>
                            <Grid container spacing={1}>
                                <Grid item xs={12}>
                                    <Typography align="center" variant="subtitle1">Balance:</Typography>
                                    <Typography align="center" variant="subtitle1">{userBalanceBNB.toLocaleString()} BNB</Typography>
                                </Grid>
                            </Grid>
                            <FormControl fullWidth>
                                <TextField color={isError ? "error" : "info"} value={displayValue} onChange={handleInputChange} />
                            </FormControl>
                        </Box>
                        <Box textAlign='center'>
                            <Slider
                                aria-label="Temperature"
                                defaultValue={0}
                                valueLabelDisplay="auto"
                                step={10}
                                marks
                                onChange={handleSliderChange}
                                min={0}
                                max={100}
                            />
                            <Button disabled={isError} variant="contained" color="primary" onClick={handleDonate}>
                                Donate
                            </Button>

                        </Box>
                    </Stack>
                </Popover>
                <Box className="flex-grow"></Box>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}


SurgeFundPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
};

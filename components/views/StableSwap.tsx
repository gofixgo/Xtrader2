import { useWeb3React } from "@web3-react/core";
import { Contract, ethers, BigNumber } from "ethers";
import React from "react";
import { useGlobalState } from "../core/StateManager";
import { BNB, BUSD, pcsRouter } from "../wallet/Contracts";

import { Box, Card, Tab, Tabs, CardContent, Toolbar, Stack, Typography, Divider, Grid, TextField, Select, MenuItem, SelectChangeEvent, Button } from "@mui/material";
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SwapVertIcon from '@mui/icons-material/SwapVert';

export default function StableSwap() {
    const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();
    // token states
    const [fromToken, setFromToken] = React.useState('');
    const [toToken, setToToken] = React.useState('');
    const [fromAmount, setFromAmount] = React.useState('');
    const [toAmount, setToAmount] = React.useState('');
    const [fromTokenBalance, setFromTokenBalance] = React.useState('');
    const [toTokenBalance, setToTokenBalance] = React.useState('');
    const [fromTokenPrice, setFromTokenPrice] = React.useState('');
    const [toTokenPrice, setToTokenPrice] = React.useState('');

    // page states
    const [reverseButtonShown, setReverseButtonShown] = React.useState(false);
    const [isApprovalNeeded, setApprovalNeeded] = React.useState(true);

    // tokens lists states for display in the select boxes
    const [tokensList, setTokensList] = React.useState(["BUSD", "USDT", "USDC"]);
    const [fromTokensList, setFromTokensList] = React.useState([]);
    const [toTokensList, setToTokensList] = React.useState([]);

    // setTokensList(["BUSD", "USDT", "USDC"]);
    // useeffect
    React.useEffect(() => {
        if (active && account) {
            setFromTokensList(tokensList.filter(token => token !== toToken));
            setToTokensList(tokensList.filter(token => token !== fromToken));
        }
    }, [active, account, tokensList, toToken, fromToken]);

    const handleFromTokenChange = (event: SelectChangeEvent) => {
        setFromToken(event.target.value);
    };
    const handleToTokenChange = (event: SelectChangeEvent) => {
        setToToken(event.target.value);
    };

    const reverseFromToTokens = () => {
        let temp = toToken
        setToToken(fromToken);
        setFromToken(temp);
    };


    // console.error(tokensList);
    const renderTab = () => {
        return (
            <>
                <Box className="flex justify-center" maxWidth='100%'>
                    <Stack spacing={2}>
                        <Typography>Balance: { }</Typography>
                        <Stack direction="row">
                            <TextField fullWidth disabled={false} />

                            <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={fromToken}
                                onChange={handleFromTokenChange}
                            >
                                {fromTokensList.map((name) => (
                                    <MenuItem key={name} value={name}>
                                        {name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Stack>
                    </Stack>
                </Box>

                <Box className="flex justify-center m-2 mb-4">
                    <Button
                        onClick={() => reverseFromToTokens()}
                        onMouseEnter={() => setReverseButtonShown(true)}
                        onMouseLeave={() => setReverseButtonShown(false)}>
                        {reverseButtonShown ? (<SwapVertIcon />) : (<ArrowDownwardIcon />)}
                    </Button>
                </Box>

                <Box className="flex justify-center" maxWidth='100%'>
                    <Stack spacing={2}>
                        <Typography>Balance: { }</Typography>
                        <Stack direction="row">
                            <TextField fullWidth disabled={false} />

                            <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={toToken}
                                onChange={handleToTokenChange}
                            >
                                {toTokensList.map((name) => (
                                    <MenuItem key={name} value={name}>
                                        {name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Stack>
                    </Stack>
                </Box>

                <Box className="flex justify-center" maxWidth='100%'>
                    <Stack className="mt-4 mb-4" spacing={1}>
                        <Button variant="contained" color="primary" onClick={() => { handleSwap(); }} >
                            Swap
                        </Button>
                    </Stack>
                </Box>

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
function handleApproval(): void {
    throw new Error("Function not implemented.");
}

function handleSwap() {
    
}


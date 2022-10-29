import { Card, CardContent, Typography, CardActions, Button, Tooltip, Toolbar, Tab, Tabs, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Slider, CardHeader, Grid, Collapse, List, Avatar, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Divider, ListItemButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Badge } from "@mui/material";
import { Box } from "@mui/system";
import { useWeb3React } from "@web3-react/core";
import React, { useState } from "react";
import { useGlobalState, setGlobalState, getGlobalState } from "../core/StateManager";
import MenuTab from "../ui/MenuTab";
import { gql, useQuery } from '@apollo/client';
import Farm from "./Farm"
import Pool from "./Pool"

export default function EarnPage() {

    const [tabValue, setTabValue] = useGlobalState('tabValue');

    const [cardType, setCardType] = useGlobalState('swapCardType');
	
	const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();


    // render Farm.tsx
	const renderFarmTab = () => {
		return (
			<Farm/>
		); 
	}

    // render StakingPools.tsx
	const renderPoolTab = () => {
		return (
            <Pool/>
        ); 
	}


	return (
		<Box>
			{account && library ? (
				<>
					<Tabs value={cardType}
						onChange={(event: React.SyntheticEvent, newValue: number) => {
							setCardType(newValue);
						}} centered>
						<MenuTab name="Farm" />
						<MenuTab hasIndicator={true} name="Pool" />
					</Tabs>
					<Card sx={{ maxWidth: '42rem', margin: '0 auto' }}>
						<CardContent>
							<Stack spacing={3}>
								<Toolbar>
									<Box sx={{ flexGrow: 1 }}>
										<Typography variant="h5" textAlign='center' color='#21bbb1'>
											{cardType === 0 ? 'Yield Farms' : 'Staking Pools'}
										</Typography>
										<Typography variant="body2" textAlign='center' color='#21bbb1'>
											{cardType === 0 ? 'Provide Liquidity To Earn A Return!' : 'Stake XUSD To Earn More Rewards'}
										</Typography>
									</Box>
								</Toolbar>
								{cardType === 0 ? renderFarmTab() : renderPoolTab()}
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
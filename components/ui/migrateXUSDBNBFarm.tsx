import * as React from 'react';
import { Dialog, DialogTitle, Button, Typography, Paper, Box, DialogContent, DialogActions, Stepper, Step, StepLabel, StepContent, CircularProgress } from '@mui/material';
import { useWeb3React } from '@web3-react/core';
import { Contract, ethers } from "ethers";
import { useSnackbar } from 'notistack';
import { xUSDV1, xUSD_migration, xUSDV1_BNB_Farm, xUSDV1_BNB_LP, xUSD_BNB_Farm_migration } from '../wallet/Contracts';
import { approveOld, allowance, MaxSafeInteger } from "../core/Utils";
import PropTypes from 'prop-types';



export default function MigrateXUSDBNBFarm(props) {
  const { onClose, open, onSteps } = props;
  const { enqueueSnackbar } = useSnackbar();
  const [activeStep, setActiveStep] = React.useState(0);
  const [isWaiting, setIsWaiting] = React.useState(false);
  const [displayedSteps, setDisplayedSteps] = React.useState([]);
  // const { activate } = useWeb3React();
  const { active, account, library, connector, chainId, activate, deactivate } = useWeb3React();

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  const xUSDV1Contract = new Contract(xUSDV1.address, xUSDV1.abi, library.getSigner());
  const xUSDMigrationContract = new Contract(xUSD_migration.address, xUSD_migration.abi, library.getSigner());
  const xUSDV1_BNB_FarmContract = new Contract(xUSDV1_BNB_Farm.address, xUSDV1_BNB_Farm.abi, library.getSigner());
  const xUSDV1_BNB_LPContract = new Contract(xUSDV1_BNB_LP.address, xUSDV1_BNB_LP.abi, library.getSigner());
  const xUSD_BNB_Farm_migrationContract = new Contract(xUSD_BNB_Farm_migration.address, xUSD_BNB_Farm_migration.abi, library.getSigner());



  let steps = [
    {
      label: 'Unlock',
      description: `This step unlocks your current xUSD-BNB LP tokens from the V1 farm.`,
      buttonLabel: 'Unlock',
      isStepCompleted: async () => {
        const balance = await xUSDV1_BNB_FarmContract.balanceOf(account);
        if (balance.isZero()) {
          return true;
        } else {
          return false;
        }
      },
      action: async () => {
        let tx = await xUSDV1_BNB_FarmContract.unlockAll();
        setIsWaiting(true);
        const reciept = await tx.wait();
        setIsWaiting(false);
        if (reciept.status == 1) {
          enqueueSnackbar("LP Tokens Unlocked", { variant: "success" });
          handleNext();
        }
      }
    },
    {
      label: 'Approve',
      description: `This step allows the migration contract to access your xUSD-BNB LP tokens.`,
      buttonLabel: 'Approve',
      isStepCompleted: async () => {

        const balance = await xUSDV1_BNB_LPContract.balanceOf(account);
        const allowance = await xUSDV1_BNB_LPContract.allowance(account, xUSD_BNB_Farm_migrationContract.address);
        if (allowance.gte(balance)) {
          return true;
        } else {
          return false;
        }

      },
      action: async () => {
        // if isStepCompleted is true, then we can proceed to the next step
        // if(await steps[activeStep].isStepCompleted()) {
        //  handleNext();
        // } else {
        let tx = await approveOld(xUSDV1_BNB_LPContract, xUSD_BNB_Farm_migrationContract.address);
        setIsWaiting(true);
        const reciept = await tx.wait();
        setIsWaiting(false);
        if (reciept.status == 1) {
          enqueueSnackbar("Approved", { variant: "success" });
          handleNext();
        }
      //}
      }
    },
    {
      label: 'Migrate!',
      description:
        'Executes the migration. You will recieve v2 LP tokens, however you still need to stake it in the farm.',
      buttonLabel: 'Migrate',
      isStepCompleted: async () => {

        const balance = await xUSDV1_BNB_LPContract.balanceOf(account);
        if (balance.isZero()) {
          return true;
        } else {
          return false;
        }

      },
      action: async () => {
        const tx = await xUSD_BNB_Farm_migrationContract.migrate()
        setIsWaiting(true);
        const reciept = await tx.wait()
        setIsWaiting(false);
        if (reciept.status == 1) {
          enqueueSnackbar("Migrated LP Tokens", { variant: "success" });
          handleNext();
        }

      }
    },

  ];


  const handleClose = () => {
    onClose();
  };

  const handleSteps = (s) => {
    onSteps(s);
  };

  const checkSteps = async () => {
    

    const arr = await Promise.all(steps.map(async (step, index, array) => {
      const isStepCompleted = await step.isStepCompleted();
      if (!isStepCompleted) {
        return index;
      }
    }))
    const filteredArr = arr.filter(x => x !== undefined);
    //// // console.log('filteredArr', filteredArr);
    if(filteredArr.length > 0){
      return steps.slice(filteredArr.sort((a, b) => a - b)[0], steps.length);
    }
    else {
      return [];
    }
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps

    checkSteps().then(checkedSteps => {
      handleSteps(checkedSteps);
      //// // console.log(checkedSteps)
      setDisplayedSteps(checkedSteps);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Dialog maxWidth="xs" onClose={handleClose} open={open}>
      <DialogTitle>xUSD-BNB Farm Migration</DialogTitle>

      <DialogContent>

        <Box sx={{ maxWidth: 400 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {displayedSteps.map((step, index) => {
              return (
                <Step key={step.label}>
                  <StepLabel
                    optional={
                      index === 2 ? (
                        <Typography variant="caption">Last step</Typography>
                      ) : null
                    }
                  >
                    {step.label}
                  </StepLabel>
                  <StepContent>
                    <Typography>{step.description}</Typography>
                    <Box sx={{ mb: 2 }}>
                      <div className="mt-3">
                        <Button
                          variant="outlined"
                          color="primary"
                          onClick={step.action}
                          style={{ height: '35px', width: '100px' }}
                        // disabled={activeStep === index}
                        >
                          {isWaiting ? (<CircularProgress style={{ height: '24px', width: '24px' }} />) : step.buttonLabel}
                        </Button>
                      </div>
                    </Box>
                  </StepContent>
                </Step>
              )
            })}
          </Stepper>
          {activeStep === displayedSteps.length && (
            <Paper square elevation={0} sx={{ p: 3 }}>
              <Typography>All steps completed - please re-stake your LP tokens in the xUSD-BNB Farm</Typography>
            </Paper>
          )}
        </Box>

      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

MigrateXUSDBNBFarm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSteps: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};
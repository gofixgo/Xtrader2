import * as React from 'react';
import { Dialog, DialogTitle, Button, Typography, Paper, Box, DialogContent, DialogActions, Stepper, Step, StepLabel, StepContent, CircularProgress } from '@mui/material';
import { useWeb3React } from '@web3-react/core';
import { Contract, ethers } from "ethers";
import { useSnackbar } from 'notistack';
import { xUSDV1, xUSD_migration } from '../wallet/Contracts';
import { approveOld, allowance, MaxSafeInteger } from "../core/Utils";
import PropTypes from 'prop-types';



export default function MigrateXUSD(props) {
  const { onClose, open } = props;
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


  let steps = [
    {
      label: 'Approve',
      description: `This step allows the migration contract to access your XUSD and sell it tax free.`,
      buttonLabel: 'Approve',
      isStepCompleted: async () => {
        const balance = await xUSDV1Contract.balanceOf(account);
        const allowance = await xUSDV1Contract.allowance(account, xUSD_migration.address);
        if (allowance.gte(balance)) {
          return true;
        } else {
          return false;
        }
      },
      action: async () => {
        let tx = await approveOld(xUSDV1Contract, xUSDMigrationContract.address);
        setIsWaiting(true);
        const reciept = await tx.wait();
        setIsWaiting(false);
        if (reciept.status == 1) {
          enqueueSnackbar("Approved", { variant: "success" });
          handleNext();
        }
      }
    },
    {
      label: 'Migrate!',
      description:
        'Executes the migration. Your XUSD will be converted to V2 tokens and deposited into your wallet.',
      buttonLabel: 'Migrate',
      isStepCompleted: async () => {
        const balance = await xUSDV1Contract.balanceOf(account);
        if (balance.isZero()) {
          return true;
        } else {
          return false;
        }
      },
      action: async () => {
        const balance = await xUSDV1Contract.balanceOf(account);
        const tx = await xUSDMigrationContract.migrate(balance)
        setIsWaiting(true);
        const reciept = await tx.wait()
        setIsWaiting(false);
        if (reciept.status == 1) {
          enqueueSnackbar("Migrated XUSD", { variant: "success" });
          handleNext();
        }

      }
    },

  ];


  const handleClose = () => {
    onClose();
  };

  const checkSteps = async () => {
    const arr = await Promise.all(steps.map(async (step) => {
      const isStepCompleted = await step.isStepCompleted();
      if (!isStepCompleted) {
        return step;
      }
    }))
    return arr.filter(x => x !== undefined);
  }

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps

    checkSteps().then(checkedSteps => {
      //// // console.log(checkedSteps)
      setDisplayedSteps(checkedSteps);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Dialog maxWidth="xs" onClose={handleClose} open={open}>
      <DialogTitle>xUSD V2 Migration</DialogTitle>

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
              <Typography>All steps completed - you&apos;re finished</Typography>
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


MigrateXUSD.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};
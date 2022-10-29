import moment from 'moment';

const YEARS = 31536000;
const DAYS = 86400;
const HOURS = 3600;
const MINUTES = 60;

export const convertBlocksToSeconds = (blocks: string) => {
  return parseFloat(blocks) * 3;
};

export const convertSecondsToBlocks = (seconds: number) => {
  return seconds / 3;
};

export const convertSecondsToDate = (seconds: number) => {
  return new Date(seconds * 1000);
};

export const convertDateToSeconds = (date: Date) => {
  return date.getTime() / 1000;
};

export const convertBlocksToDate = (blocks: string) => {
  return convertSecondsToDate(convertBlocksToSeconds(blocks));
};

export const convertSecondsToDayHourMinuteSeconds = (seconds: number) => {
  const days = Math.floor(seconds / DAYS);
  const hours = Math.floor((seconds % DAYS) / HOURS);
  const minutes = Math.floor((seconds % HOURS) / MINUTES);
  const secondsLeft = Math.floor(seconds % MINUTES);
  return {
    days: days.toString(),
    hours: hours.toString(),
    minutes: minutes.toString(),
    seconds: secondsLeft.toString(),
  };
};
export const convertBlocksIntoReadableTimeString = (blocks: string, skipSeconds = false) => {
  return convertSecondsIntoReadableTimeString(convertBlocksToSeconds(blocks), skipSeconds);
};
export const convertBlocksIntoBiggestUnitTimeString = (blocks: string, skipSeconds = false) => {
  return convertSecondsIntoBiggestUnitTimeString(convertBlocksToSeconds(blocks));
};

export const convertSecondsIntoReadableTimeString = (seconds: number, skipSeconds = false) => {

  if (seconds === 0) {
    return '0 Seconds'
  }

  const data = convertSecondsToDayHourMinuteSeconds(seconds);
  const daysStr = Number(data.days) == 0 ? '' : data.days + 'D ';
  const hourStr = Number(data.hours) == 0 ? '' : data.hours + 'H ';
  const minStr = Number(data.minutes) == 0 ? '' : data.minutes + 'M ';
  const secStr = ( Number(data.seconds) == 0 && seconds >= 60 ) || seconds >= 60 || skipSeconds ? '' : data.seconds + 'S';
  return daysStr + hourStr + minStr + secStr;
};

export const convertSecondsIntoBiggestUnitTimeString = (seconds: number) => {
  const years = Math.floor(seconds / YEARS);
  const secondsToUse = years == 0 ? seconds : seconds - years * YEARS;

  const data = convertSecondsToDayHourMinuteSeconds(secondsToUse);
  if (years !== 0) {
    return years.toString() + 'Y ';
  }
  if (Number(data.days) !== 0) {
    return data.days + 'D ';
  }
  if (Number(data.hours) !== 0) {
    return data.hours + 'H ';
  }
  if (Number(data.minutes) !== 0) {
    return data.minutes + 'M ';
  }
  if (Number(data.seconds) !== 0) {
    return data.seconds + 'S ';
  }
  return 'Ended';
};

export const convertBlocksToDayHourMinute = (blocks: string) => {
  const seconds = convertBlocksToSeconds(blocks);
  return convertSecondsToDayHourMinuteSeconds(seconds);
};

/**
 * @description calculates the difference in seconds between two dates
 * @param endDate unix timestamp
 * @param startDate (optional) unix timestamp. if not supplied, will use current time
 * @returns number of blocks between startDate and endDate
 */
export const differenceInseconds = (endDate: number, startDate?: number) => {
  if (!startDate) {
    startDate = moment().unix();
  }
  return endDate - startDate;
};
/**
 * @description calculates the difference in blocks between two dates
 * @param endDate unix timestamp
 * @param startDate unix timestamp
 * @returns number of blocks between startDate and endDate
 */
export const differenceInBlocks = (startDate: number, endDate: number) => {
  return convertSecondsToBlocks(differenceInseconds(endDate, startDate));
};

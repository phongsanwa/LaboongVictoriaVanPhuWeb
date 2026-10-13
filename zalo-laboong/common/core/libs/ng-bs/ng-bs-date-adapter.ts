import { Injectable } from '@angular/core';
import { NgbDateAdapter, NgbDateParserFormatter, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { EXCEPTION_DATES } from '@shared/constants';

const DELIMITER = '/';
const DELIMITER_COMMON = '-'; // Ký tự API trả

export function validAndSplitDateString(value: any) {
  if (!value || typeof value !== 'string' || EXCEPTION_DATES.includes(value)) {
    return null;
  }
  let date: string[] = [];
  if (value.includes(DELIMITER)) {
    date = value.split(DELIMITER);
  } else if (value.includes(DELIMITER_COMMON)) {
    date = value.split(DELIMITER_COMMON);
  }
  if (!date || !date.length) {
    return null;
  }

  return date;
}

export function formatNumberWithLeadingZero(number: number) {
  return number < 10 ? '0' + number : '' + number;
}

/**
 * This Service handles how the date is represented in scripts i.e. ngModel.
 */
@Injectable()
export class CustomAdapter extends NgbDateAdapter<string> {
  fromModel(value: string | null): NgbDateStruct | null {
    const date: string[] | null = validAndSplitDateString(value);
    if (!date || !date.length) {
      return null;
    }
    return {
      day: parseInt(date[2], 10),
      month: parseInt(date[1], 10),
      year: parseInt(date[0], 10),
    };
  }

  toModel(date: NgbDateStruct | null): string | null {
    if (!date) return null;
    return (
      date.year +
      '-' +
      formatNumberWithLeadingZero(date.month) +
      '-' +
      formatNumberWithLeadingZero(date.day)
    );
  }
}

/**
 * This Service handles how the date is rendered and parsed from keyboard i.e. in the bound input field.
 */
@Injectable()
export class CustomDateParserFormatter extends NgbDateParserFormatter {
  parse(value: string): NgbDateStruct | null {
    const dateParse: string[] | null = validAndSplitDateString(value);
    if (!dateParse || !dateParse.length) {
      return null;
    }

    return {
      day: parseInt(dateParse[0], 10),
      month:
        dateParse[1].length === 1 ? parseInt('0' + dateParse[1], 10) : parseInt(dateParse[1], 10),
      year: parseInt(dateParse[2], 10),
    };
  }

  format(date: NgbDateStruct | null): string {
    return date
      ? formatNumberWithLeadingZero(date.day) +
          DELIMITER +
          formatNumberWithLeadingZero(date.month) +
          DELIMITER +
          date.year
      : '';
  }
}

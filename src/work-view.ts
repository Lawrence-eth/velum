import type {workTerms} from './work-order';
import type {JobResult} from './cre-jobs';
export type WorkView={ok:boolean;error?:string;status?:string;terms?:typeof workTerms;budget?:{total:string;reserved:string;paid:string;available:string};attempts?:{id:string;scenario:string;recoveries?:number;status:string;execution?:JobResult;error?:string}[]};

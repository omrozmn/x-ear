/**
 * Copied Orval-generated client for OutEBelgeV2
 * Do not edit generated types unless necessary.
 */
import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface SendDocumentRequestData { receiverTag?: string; documentBytes: string; isDocumentNoAuto: boolean; systemTypeCodes: string; }
export interface SendDocumentResponse { invoiceNo?: string; zipped?: string; htmlString?: string; pdfLink?: string; }
export interface ApiResponseSendDocumentResponse { Success?: boolean; Message?: string; Code?: string; Result?: SendDocumentResponse; }
export interface SendBasicInvoiceFromModelRequestData { invoice: any }

export interface UpdateUnreadedStatusRequestData {
  uuid: string;
  systemType: string;
  documentType?: string;
  inOutCode?: string;
}

export interface SendDocumentAnswerRequestData {
  documentUUID: string;
  acceptOrRejectCode: 'KABUL' | 'RED' | 'IPTAL';
  acceptOrRejectReason?: string;
  systemTypeCodes: string;
}

export interface GetInBoxDocumentsRequestData {
  pageNumber?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  readStatus?: string;
  systemTypeCodes?: string;
}

export interface ApiResponseString { Success?: boolean; Message?: string; Code?: string; Result?: string; }

export interface SendDocumentAnswerResponse { Code?: string; Description?: string; Success?: boolean; }
export interface ApiResponseSendDocumentAnswerResponse { Success?: boolean; Message?: string; Code?: string; Result?: SendDocumentAnswerResponse; }

export const getOutEBelgeV2API = () => {
  const postApiOutEBelgeV2SendDocument = <TData = AxiosResponse<ApiResponseSendDocumentResponse>>(
    sendDocumentRequestData: SendDocumentRequestData, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/SendDocument`, sendDocumentRequestData, options);
  }

  const postApiOutEBelgeV2SendBasicInvoiceFromModel = <TData = AxiosResponse<ApiResponseSendDocumentResponse>>(
    sendBasicInvoiceFromModelRequestData: SendBasicInvoiceFromModelRequestData, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/SendBasicInvoiceFromModel`, sendBasicInvoiceFromModelRequestData, options);
  }

  const postApiOutEBelgeV2DocumentDownloadByUUID = <TData = AxiosResponse<any>>(
    documentDownloadByUUIDRequestData: any, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/DocumentDownloadByUUID`, documentDownloadByUUIDRequestData, options);
  }

  const postApiOutEBelgeV2GetEnvelopeStatusFromGIB = <TData = AxiosResponse<any>>(
    getEnvelopeStatusFromGIBFreeRequestData: any, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/GetEnvelopeStatusFromGIB`, getEnvelopeStatusFromGIBFreeRequestData, options);
  }

  const postApiOutEBelgeV2ReEnvelopeAndSend = <TData = AxiosResponse<any>>(
    reEnvelopeAndSendRequestData: any, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/ReEnvelopeAndSend`, reEnvelopeAndSendRequestData, options);
  }

  const postApiOutEBelgeV2GetInBoxDocuments = <TData = AxiosResponse<any>>(
    getInBoxDocumentsRequestData: GetInBoxDocumentsRequestData, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/GetInBoxDocuments`, getInBoxDocumentsRequestData, options);
  }

  const postApiOutEBelgeV2GetInBoxDocumentsWithDetail = <TData = AxiosResponse<any>>(
    getInBoxDocumentsRequestData: GetInBoxDocumentsRequestData, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/GetInBoxDocumentsWithDetail`, getInBoxDocumentsRequestData, options);
  }

  const postApiOutEBelgeV2UpdateUnreadedStatus = <TData = AxiosResponse<ApiResponseString>>(
    updateUnreadedStatusRequestData: UpdateUnreadedStatusRequestData, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/UpdateUnreadedStatus`, updateUnreadedStatusRequestData, options);
  }

  const postApiOutEBelgeV2SendDocumentAnswer = <TData = AxiosResponse<ApiResponseSendDocumentAnswerResponse>>(
    sendDocumentAnswerRequestData: SendDocumentAnswerRequestData, options?: AxiosRequestConfig
  ): Promise<TData> => {
    return axios.post(`/api/OutEBelgeV2/SendDocumentAnswer`, sendDocumentAnswerRequestData, options);
  }

  return { 
    postApiOutEBelgeV2SendDocument, 
    postApiOutEBelgeV2SendBasicInvoiceFromModel, 
    postApiOutEBelgeV2DocumentDownloadByUUID, 
    postApiOutEBelgeV2GetEnvelopeStatusFromGIB, 
    postApiOutEBelgeV2ReEnvelopeAndSend,
    postApiOutEBelgeV2GetInBoxDocuments,
    postApiOutEBelgeV2GetInBoxDocumentsWithDetail,
    postApiOutEBelgeV2UpdateUnreadedStatus,
    postApiOutEBelgeV2SendDocumentAnswer
  };
}

export type PostApiOutEBelgeV2SendDocumentResult = AxiosResponse<ApiResponseSendDocumentResponse>
export type PostApiOutEBelgeV2SendBasicInvoiceFromModelResult = AxiosResponse<ApiResponseSendDocumentResponse>

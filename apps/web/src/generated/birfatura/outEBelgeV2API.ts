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

  return { postApiOutEBelgeV2SendDocument, postApiOutEBelgeV2SendBasicInvoiceFromModel, postApiOutEBelgeV2DocumentDownloadByUUID, postApiOutEBelgeV2GetEnvelopeStatusFromGIB, postApiOutEBelgeV2ReEnvelopeAndSend };
}

export type PostApiOutEBelgeV2SendDocumentResult = AxiosResponse<ApiResponseSendDocumentResponse>
export type PostApiOutEBelgeV2SendBasicInvoiceFromModelResult = AxiosResponse<ApiResponseSendDocumentResponse>

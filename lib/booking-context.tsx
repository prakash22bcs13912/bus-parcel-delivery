import React, { createContext, useContext, useState } from 'react';
import { RouteWithBus, RouteStop, PaymentMethod } from './types';

interface BookingState {
  fromCity: string;
  toCity: string;
  travelDate: string;
  selectedRoute: RouteWithBus | null;
  boardingStop: RouteStop | null;
  destinationStop: RouteStop | null;
  parcelType: string;
  weightKg: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  instructions: string;
  estimatedPrice: number;
  paymentMethod: PaymentMethod;
  bookingId: string | null;
  bookingCode: string | null;
}

interface BookingContextType extends BookingState {
  setFromCity: (v: string) => void;
  setToCity: (v: string) => void;
  setTravelDate: (v: string) => void;
  setSelectedRoute: (v: RouteWithBus | null) => void;
  setBoardingStop: (v: RouteStop | null) => void;
  setDestinationStop: (v: RouteStop | null) => void;
  setParcelType: (v: string) => void;
  setWeightKg: (v: string) => void;
  setSenderName: (v: string) => void;
  setSenderPhone: (v: string) => void;
  setReceiverName: (v: string) => void;
  setReceiverPhone: (v: string) => void;
  setInstructions: (v: string) => void;
  setEstimatedPrice: (v: number) => void;
  setPaymentMethod: (v: PaymentMethod) => void;
  setBookingReference: (id: string, code: string) => void;
  reset: () => void;
}

const initialState: BookingState = {
  fromCity: '',
  toCity: '',
  travelDate: '',
  selectedRoute: null,
  boardingStop: null,
  destinationStop: null,
  parcelType: 'Document',
  weightKg: '',
  senderName: '',
  senderPhone: '',
  receiverName: '',
  receiverPhone: '',
  instructions: '',
  estimatedPrice: 0,
  paymentMethod: 'cash' as PaymentMethod,
  bookingId: null,
  bookingCode: null,
};

const BookingContext = createContext<BookingContextType>({
  ...initialState,
  setFromCity: () => {},
  setToCity: () => {},
  setTravelDate: () => {},
  setSelectedRoute: () => {},
  setBoardingStop: () => {},
  setDestinationStop: () => {},
  setParcelType: () => {},
  setWeightKg: () => {},
  setSenderName: () => {},
  setSenderPhone: () => {},
  setReceiverName: () => {},
  setReceiverPhone: () => {},
  setInstructions: () => {},
  setEstimatedPrice: () => {},
  setPaymentMethod: () => {},
  setBookingReference: () => {},
  reset: () => {},
});

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(initialState);

  const update = (key: keyof BookingState, value: any) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const reset = () => setState(initialState);

  return (
    <BookingContext.Provider
      value={{
        ...state,
        setFromCity: (v) => update('fromCity', v),
        setToCity: (v) => update('toCity', v),
        setTravelDate: (v) => update('travelDate', v),
        setSelectedRoute: (v) => update('selectedRoute', v),
        setBoardingStop: (v) => update('boardingStop', v),
        setDestinationStop: (v) => update('destinationStop', v),
        setParcelType: (v) => update('parcelType', v),
        setWeightKg: (v) => update('weightKg', v),
        setSenderName: (v) => update('senderName', v),
        setSenderPhone: (v) => update('senderPhone', v),
        setReceiverName: (v) => update('receiverName', v),
        setReceiverPhone: (v) => update('receiverPhone', v),
        setInstructions: (v) => update('instructions', v),
        setEstimatedPrice: (v) => update('estimatedPrice', v),
        setPaymentMethod: (v) => update('paymentMethod', v),
        setBookingReference: (id, code) => setState((prev) => ({ ...prev, bookingId: id, bookingCode: code })),
        reset,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  return useContext(BookingContext);
}

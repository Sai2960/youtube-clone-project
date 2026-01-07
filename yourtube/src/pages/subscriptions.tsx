import React from 'react';
import SubscriptionPage from '@/components/SubscriptionPage';
import { GetServerSideProps } from "next";


export default function Subscriptions() {
  return <SubscriptionPage />;
}
export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {}, // Client-side handles user history data
  };
};
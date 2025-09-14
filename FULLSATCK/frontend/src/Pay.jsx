import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const Pay = () => {
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState(null); // For GET example
  const table = searchParams.get('table');

  // Example: Fetch order details (GET)
  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/customer/${table}`);
      if (!response.ok) throw new Error('Failed to fetch order details');
      const data = await response.json();
      setOrderData(data);
    } catch (err) {
      setError('Could not fetch order details');
    }
  };

  // Razorpay payment handler (POST)
  const handlePay = async () => {
    setProcessing(true);
    setError('');
    if (!window.Razorpay) {
      setError('Razorpay SDK not loaded. Please check your internet connection or script tag.');
      setProcessing(false);
      return;
    }
    const amount = 100 * 100; // 100 INR in paise (for demo)
    const options = {
      key: 'rzp_test_YourKeyHere', // Replace with your Razorpay key
      amount: amount,
      currency: 'INR',
      name: 'Restaurant Payment',
      description: `Payment for Table ${table}`,
      handler: async function (response) {
        // On successful payment, call backend (POST)
        try {
          const res = await fetch('http://localhost:5000/api/payment/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableNumber: table })
          });
          if (!res.ok) throw new Error('Payment failed');
          setCompleted(true);
        } catch (err) {
          setError('Payment succeeded but backend update failed.');
        }
        setProcessing(false);
      },
      prefill: {
        name: '',
        email: '',
        contact: ''
      },
      theme: {
        color: '#4caf50'
      }
    };
    setProcessing(false);
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 80 }}>
      <h2>Table {table} Payment</h2>
      <button onClick={fetchOrderDetails} style={{ marginBottom: 20 }}>Fetch Order Details (GET)</button>
      {orderData && (
        <pre style={{ background: '#eee', padding: 10, borderRadius: 6, maxWidth: 400, textAlign: 'left' }}>
          {JSON.stringify(orderData, null, 2)}
        </pre>
      )}
      {!completed ? (
        <>
          <button onClick={handlePay} disabled={processing} style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#4caf50', color: '#fff', border: 'none', marginTop: 30 }}>
            {processing ? 'Processing...' : 'Pay Now'}
          </button>
          {processing && <div style={{ marginTop: 20 }}>Please wait, processing your payment...</div>}
          {error && <div style={{ color: 'red', marginTop: 20 }}>{error}</div>}
        </>
      ) : (
        <div style={{ marginTop: 40, color: '#4caf50', fontSize: 24, fontWeight: 'bold' }}>Payment Completed!</div>
      )}
    </div>
  );
};

export default Pay;
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
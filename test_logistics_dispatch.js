// Test script for dispatch to logistics functionality
const axios = require('axios');
const API_URL = 'http://localhost:3000';

const sellerToken = ""; // Replace with a valid seller token
const orderId = ""; // Replace with a valid order ID
const logisticsId = ""; // Replace with a valid logistics provider ID

async function testDirectDispatch() {
    try {
        console.log("\n===== Testing Direct Dispatch to Customer =====");
        const response = await axios.post(
            `${API_URL}/order/dispatch-to-logistics`,
            {
                orderId: orderId,
                logisticsId: logisticsId,
                deliveryDestination: 'customer'
            },
            {
                headers: { Authorization: `Bearer ${sellerToken}` }
            }
        );

        console.log("Response status:", response.status);
        console.log("Response data:", JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error("Error dispatching directly to customer:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

async function testColdStorageDispatch() {
    try {
        console.log("\n===== Testing Dispatch to Cold Storage =====");
        const response = await axios.post(
            `${API_URL}/order/dispatch-to-logistics`,
            {
                orderId: orderId,
                logisticsId: logisticsId,
                deliveryDestination: 'coldstorage'
            },
            {
                headers: { Authorization: `Bearer ${sellerToken}` }
            }
        );

        console.log("Response status:", response.status);
        console.log("Response data:", JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error("Error dispatching to cold storage:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

async function getOrderDetails(orderId) {
    try {
        console.log(`\n===== Getting Order Details for ${orderId} =====`);
        const response = await axios.get(
            `${API_URL}/order/tracking/${orderId}`,
            {
                headers: { Authorization: `Bearer ${sellerToken}` }
            }
        );

        console.log("Order Status:", response.data.status);
        console.log("Delivery Destination:", response.data.deliveryDestination);
        return response.data;
    } catch (error) {
        console.error("Error getting order details:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

// Run the tests - comment/uncomment as needed
// testDirectDispatch().then(() => console.log("Direct dispatch test completed"));
// testColdStorageDispatch().then(() => console.log("Cold storage dispatch test completed"));
// getOrderDetails(orderId).then(() => console.log("Order details retrieved"));

console.log(`
To use this script:
1. Update the sellerToken with a valid JWT token for a seller account
2. Update the orderId with a pending order ID
3. Update the logisticsId with a valid logistics provider ID
4. Uncomment the test function you want to run
5. Run the script using: node test_logistics_dispatch.js
`);
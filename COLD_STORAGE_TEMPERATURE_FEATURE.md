# Cold Storage Temperature Monitoring System

This feature adds temperature and humidity monitoring for products stored in cold storage facilities. The data is collected in real-time and displayed to cold storage operators, buyers, and sellers.

## Features

1. **Real-time Temperature Monitoring**: Displays current temperature and humidity data for products in cold storage
2. **Historical Data**: Stores a history of temperature readings for tracking and compliance
3. **Access Control**: Shows temperature data to the relevant stakeholders (cold storage operators, buyers, and sellers)
4. **Alert System**: Visual indicators when temperature exceeds safe limits

## Setup Instructions

### Database Setup

The system uses a collection called `tempdata` in MongoDB with the following schema:

- `orderId`: String - ID of the order
- `productId`: String - ID of the product
- `productName`: String - Name of the product
- `temperature`: Number - Temperature in Celsius
- `humidity`: Number - Humidity percentage
- `timestamp`: Date - When the reading was taken
- `sellerId`: String - ID of the seller
- `buyerId`: String - ID of the buyer
- `coldStorageId`: String - ID of the cold storage facility

### Backend Setup

1. **Schema and Models**: Implemented in `src/coldStorage/temp-data.schema.ts`
2. **Service**: Business logic in `src/coldStorage/cold-storage.service.ts`
3. **Controller**: API endpoints in `src/coldStorage/cold-storage.controller.ts`
4. **Module**: Configuration in `src/coldStorage/cold-storage.module.ts`

### Frontend Components

1. **Cold Storage Dashboard**: Enhanced to display temperature data in `src/pages/DashboardColdStorage.tsx`
2. **Reusable Component**: `src/components/ColdStorageTemperatureDisplay.tsx` - Can be added to buyer and seller dashboards

### API Endpoints

- `GET /cold-storage/temperature/:orderId` - Get temperature history for a specific order
- `GET /cold-storage/temperature/latest/:orderId` - Get the latest temperature reading for a specific order
- `GET /cold-storage/temperature` - Get temperature data for all orders relevant to the authenticated user

### Sample Data Generation

To generate sample temperature data for testing:

```bash
cd backend
node src/scripts/generate-temp-data.js
```

## Integration with Buyer and Seller Dashboards

To add temperature monitoring to the buyer or seller dashboard:

1. Import the component:
```tsx
import ColdStorageTemperatureDisplay from '../components/ColdStorageTemperatureDisplay';
```

2. Add the component to the dashboard:
```tsx
<ColdStorageTemperatureDisplay userRole="buyer" userId={userId} />
```
or
```tsx
<ColdStorageTemperatureDisplay userRole="seller" userId={userId} />
```

## Security Considerations

- Temperature data is only shown to authorized users (cold storage operators, buyers, and sellers of the specific product)
- Authentication is required for all API endpoints
- Role-based filtering ensures users only see data relevant to them

## Future Enhancements

- Real-time notifications when temperature exceeds thresholds
- Integration with IoT sensors for automated data collection
- Advanced analytics and reporting capabilities
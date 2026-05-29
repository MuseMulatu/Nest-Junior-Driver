import { Image, Text, View } from "react-native";

import { icons } from "@/constants";
import { formatDate, formatTime } from "@/lib/utils";
import { Ride } from "@/types/type";

const RideCard = ({ ride }: { ride: Ride }) => {
  return (
  <View className="flex flex-row items-center justify-center bg-white rounded-lg shadow-lg shadow-neutral-300 mb-3 mx-4">
    <View className="flex flex-col items-start justify-center p-4 w-full">
      <View className="flex flex-row items-center justify-between w-full">
        {/* Map Image */}
        <Image
          source={{
            uri: `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${ride.destination_longitude},${ride.destination_latitude}&zoom=14&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`,
          }}
          className="w-[90px] h-[100px] rounded-lg"
        />

        {/* Ride Information */}
        <View className="flex flex-col mx-5 gap-y-5 flex-1">
          {/* Origin Address */}
          <View className="flex flex-row items-center gap-x-2">
            <Image source={icons.to} className="w-5 h-5" />
            <Text className="text-md font-JakartaMedium" numberOfLines={1}>
              {ride.origin_address}
            </Text>
          </View>

          {/* Destination Address */}
          <View className="flex flex-row items-center gap-x-2">
            <Image source={icons.point} className="w-5 h-5" />
            <Text className="text-md font-JakartaMedium" numberOfLines={1}>
              {ride.destination_address}
            </Text>
          </View>
        </View>
      </View>

      {/* Ride Details */}
      <View className="flex flex-col w-full mt-5 bg-general-500 rounded-lg p-4">
        {/* Date & Time */}
        <View className="flex flex-row items-center w-full justify-between mb-4">
          <Text className="text-md font-JakartaMedium text-gray-500">Date & Time</Text>
          <Text className="text-md font-JakartaBold" numberOfLines={1}>
            {formatDate(ride.created_at)}, {formatTime(ride.ride_time)}
          </Text>
        </View>

        {/* Driver Info */}
        <View className="flex flex-row items-center w-full justify-between mb-4">
          <Text className="text-md font-JakartaMedium text-gray-500">Driver</Text>
          <Text className="text-md font-JakartaBold">
            {ride.driver.first_name}
            <Image source={{ uri: ride.driver.profile_image }} className="w-8 h-8 rounded-full ml-2" />
          </Text>
        </View>

        {/* Car Seats */}
        <View className="flex flex-row items-center w-full justify-between mb-4">
          <Text className="text-md font-JakartaMedium text-gray-500">Car Seats</Text>
          <Text className="text-md font-JakartaBold">{ride.driver.car_seats}</Text>
        </View>

        {/* Payment Status */}
        <View className="flex flex-row items-center w-full justify-between">
          <Text className="text-md font-JakartaMedium text-gray-500">Payment Status</Text>
          <Text
            className={`text-md capitalize font-JakartaBold ${
              ride.payment_status === "paid" ? "text-green-500" : "text-red-500"
            }`}
          >
            {ride.payment_status}
          </Text>
        </View>
      </View>
    </View>
  </View>
);

};

export default RideCard;

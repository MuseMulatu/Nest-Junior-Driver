import { create } from "zustand";
import { DriverStore, LocationStore, MarkerData } from "@/types/type";


export const useLocationStore = create<LocationStore>((set) => ({
  userLatitude: null,
  userLongitude: null,
  userAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,
  setUserLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
    }));

    // if driver is selected and now new location is set, clear the selected driver
    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },

  setDestinationLocation: ({
    latitude,
    longitude,
    address,
  }: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    set(() => ({
      destinationLatitude: latitude,
      destinationLongitude: longitude,
      destinationAddress: address,
    }));

    // if driver is selected and now new location is set, clear the selected driver
    const { selectedDriver, clearSelectedDriver } = useDriverStore.getState();
    if (selectedDriver) clearSelectedDriver();
  },
}));

export const useDriverStore = create<DriverStore>((set) => ({
  drivers: [] as MarkerData[],
  selectedDriver: null,
  setSelectedDriver: (driverId: number) =>
    set(() => ({ selectedDriver: driverId })),
  setDrivers: (drivers: MarkerData[]) => set(() => ({ drivers })),
  clearSelectedDriver: () => set(() => ({ selectedDriver: null })),
}));

export const useLanguageStore = create((set) => ({
  language: 'ENG',
  setLanguage: (lang) => set({ language: lang }),
}));

export const useCreditbalanceStore = create((set) => ({
  creditBalance: 0,
  setCreditBalance: (balance) => set({ creditBalance: balance }),
}));

export const useDriverkmPriceStore = create((set) => ({
  kmPriceStore: 19,
  setKmPriceStore: (kmPrice) => set({ kmPriceStore: kmPrice }),
}));

export const useDrivernightkmPriceStore = create((set) => ({
  nightkmPriceStore: 21,
  setNightkmPriceStore: (kmPrice) => set({ nightkmPriceStore: kmPrice }),
}));



export const useDriverStatsStore = create((set) => ({
  dailyTripsCount: 0,
  weeklyTripsCount: 0,
  weeklyStreetPickupCount: 0,
  monthlyTripsCount: 0,
  monthlyStreetPickup: 0,
  dailyFareTotal: 0,
  weeklyFareTotal: 0,
  monthlyFareTotal: 0,

  // Batch update function
  setDriverStats: (stats) => set((state) => ({ ...state, ...stats })),
}));

export const usePhoneNumberStore = create((set) => ({
  phoneNumberStore: null,
  profileImageUrl: null,
  carModel: "",
  bio: "",
  seatNumber: 4,
  plateNumber: null,
  color: "",
  approvedRecharge: {}, 
  setprofileDetails: (updatedFields) =>
    set((state) => ({ ...state, ...updatedFields })),
  setPhoneNumberStore: (status) => set({ phoneNumberStore: status }),
  setProfileImageUrl: (status) => set({ profileImageUrl: status }),
}));

export const usePioneerStore = create((set) => ({
  isPioneer: null,
  tierType: null,
  setIsPioneer: (status) => set({ isPioneer: status }),
  setTierType: (status) => set({ tierType: status }),
}));


export const useCreditStore = create((set) => ({
  adminCreditAmount: null,
  adminAlertText: null,
  adminCbeAccount: null,
  adminTelebirr: null,
  PROMO_END_DATE: null,
creditRechargeModalContent: null,
  // Batch update function for efficiency
  setCreditStore: (updates) => set((state) => ({ ...state, ...updates })),
}));

export const useAdminNumsStore = create((set) => ({
  baseFare: 130,
  distanceRate: 19,
  nightRate: 21,
  timeRate: 1.8,
  VAT: 0,

  // Function to update all admin settings at once
  setAdminSettings: (updates) => set((state) => ({ ...state, ...updates }))
}));

export const useDriverStatusStore = create((set) => ({
  isSuspended: false,
  isOutdated: false,

  setIsSuspended: (status) => set({ isSuspended: status,}),
  setIsOutdated: (status) => set({ isOutdated: status }),
}));

export const useShareUsernameStore = create((set) => ({
  shareUsername: null,
  socialCount: 0,
  expoToken: null,
  setShareUsername: (status) => set({ shareUsername: status }),
  setSocialCount: (status) => set({ socialCount: status }),
  setExpoToken: (status) => set({ expoToken: status }),
}));

export const useRateLimitStore = create((set, get) => ({
  // Track voted comments (postId + commentId as key)
  votedComments: new Set(),

  // Track global voting timestamps
  voteTimestamps: [],

  // Track comment submission timestamps
  commentTimestamps: [],

  // Add a vote for a specific post/comment
  addVote: (key) => {
    set((state) => ({
      votedComments: new Set([...state.votedComments, key]),
    }));
  },

  // Add a vote timestamp
  addVoteTimestamp: () => {
    set((state) => ({
      voteTimestamps: [...state.voteTimestamps, Date.now()],
    }));
  },

  // Add a comment timestamp
  addCommentTimestamp: () => {
    set((state) => ({
      commentTimestamps: [...state.commentTimestamps, Date.now()],
    }));
  },

  // Check if the user can vote (10 votes/hour limit)
  canVote: () => {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour in milliseconds
    const recentVotes = get().voteTimestamps.filter((ts) => ts > hourAgo);
    return recentVotes.length < 10;
  },

  // Check if the user can comment (4 comments/hour limit)
  canComment: () => {
    const now = Date.now();
    const hourAgo = now - 3600000; // 1 hour in milliseconds
    const recentComments = get().commentTimestamps.filter((ts) => ts > hourAgo);
    return recentComments.length < 4;
  },
}));

export const useTierLimitsStore = create((set) => ({
  tierLimits: null, // Store for tier limits data
  setTierLimits: (status) => set({ tierLimits: status }),
}))

export const usePriceLogStore = create((set) => ({
  priceUpdateLog: [],
  setPriceUpdateLog: (log) => set({ priceUpdateLog: log }),
}));

interface SoloCancelledState {
  isCancelled: boolean;
  setCancelled: (value: boolean) => void;
}

export const useSoloCancelledStore = create<SoloCancelledState>((set) => ({
  isCancelled: false,
  setCancelled: (value) => set({ isCancelled: value }),
}));

export const useSharedCancelledStore = create((set) => ({
  cancelledNumber: null,
  setCancelledNumber: (pnumber) => set({ cancelledNumber: pnumber }),
  reset: () => set({ cancelledNumber: null }),
}));

export const useSharedAddStore = create((set) => ({
  addedMember: null,
  setAddedMember: (member) => set({ addedMember: member }),
  reset: () => set({ addedMember: null }),
}));

export const useCallCenterPickupStore = create(set => ({
  pickup: null,
  setCallCenterPickup: (pickup) => set({ pickup }),
  clearPickup: () => set({ pickup: null }),
}));

export const useTipStore = create((set) => ({
  tip: null,
  setTip: (value) => set({ tip: value }),
  resetTip: () => set({ tip: null }),
}));

export const useTrackStore = create((set) => ({
  track: false,
  setTrack: (value) => set({ track: value }),
  resetTrack: () => set({ track: false }),
}));

export const useEmergencyStore = create(set => ({
  trackedDriver: null,
  setTrackingData: (trackedDriver) => set({ trackedDriver }),
  clearTracking: () => set({ trackedDriver: null }),
}));

export const useLookInStore = create((set) => ({
  isBroadcasting: false,
  roomId: null,
  startLookIn: (roomId: string) => set({ isBroadcasting: true, roomId }),
  stopLookIn: () => set({ isBroadcasting: false, roomId: null }),
}));
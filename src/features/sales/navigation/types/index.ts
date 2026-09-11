import type { NavigatorScreenParams } from '@react-navigation/native';

export type SalesTabParamList = {
  Home: undefined;
  Leads: { filter?: string } | undefined;
  Activities: undefined;
  Customers: undefined;
  Profile: undefined;
};

export type SalesStackParamList = {
  SalesTabs: NavigatorScreenParams<SalesTabParamList> | undefined;
  LeadDetail: { id: string };
  LeadCreate: { resumeLeadId?: string } | undefined;
  OpportunityDetail: { id: string };
  CustomerDetail: { id: string };
  CustomerCreate: undefined;
  Notifications: undefined;
  EditProfile: undefined;
  NotificationSettings: undefined;
  ChangePassword: undefined;
  PrivacySecurity: undefined;
};

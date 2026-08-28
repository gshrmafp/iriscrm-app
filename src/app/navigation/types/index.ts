import { NavigatorScreenParams } from '@react-navigation/native';
import { SalesStackParamList } from '@/features/sales/navigation/types';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type AppDrawerParamList = {
  SalesStack: NavigatorScreenParams<SalesStackParamList>;
  ProfileScreen: undefined;
};

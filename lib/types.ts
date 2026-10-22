export type CustomerTheme = "blush" | "lavender" | "champagne";

export interface CustomerPhoto {
  url: string;
  caption: string;
}

export interface CustomerPublic {
  id: string;
  slug: string;
  name: string;
  birthday: string;
  headline: string;
  subtitle: string;
  sender: string;
  letter: string;
  finalMessage: string;
  theme: CustomerTheme;
  photos: CustomerPhoto[];
}

export type CustomerTeaser = Pick<
  CustomerPublic,
  "slug" | "name" | "birthday" | "headline" | "subtitle" | "theme"
>;
export type CustomerInput = Omit<CustomerPublic, "id"> & { birthYear: string };
export interface CustomerAdmin extends CustomerPublic {
  createdAt: string;
  updatedAt: string;
}

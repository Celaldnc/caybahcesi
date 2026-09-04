import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

import { Palette } from '@/constants/colors';

// Bu dosya yalnizca web icindir ve statik render sirasinda her sayfanin kok
// HTML'ini yapilandirir. Icerigi sadece Node.js ortaminda calisir; DOM veya
// tarayici API'lerine erisimi yoktur.
export default function Root({ children }: { children: ReactNode }) {
  return (
    // lang="tr": WCAG 3.1.1. Ekran okuyucu Turkce metni dogru telaffuz motoruyla
    // okusun diye. "en" birakilirsa "Cay Bahcesi" Ingilizce seslendirilir.
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Web'de body kaydirmasini kapatir; ScrollView native davranisina yaklasir.
        */}
        <ScrollViewStyleReset />

        {/* Ham CSS: koyu modda zemin renginin titremesini engellemek icin kacis kapisi. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Renkler paletten geliyor. Sabit #fff/#000 kullanilsaydi ilk boyamada
// beyaz/siyah bir kare gorunup ardindan tema rengine sicrardi.
const responsiveBackground = `
body {
  background-color: ${Palette.krem};
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: ${Palette.gece};
  }
}`;

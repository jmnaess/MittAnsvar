import { useState } from 'react';
import { Linking } from 'react-native';
import { ListRow, Message, Text } from '../../../ui';
import { getAppInfo } from '../appInfo';
import { buildFeedbackMailto, SUPPORT_EMAIL } from '../feedbackEmail';

/** «Send tilbakemelding»: åpner e-postappen. Uten e-postapp vises adressen, som kan kopieres. */
export function FeedbackRow() {
  const [noMailApp, setNoMailApp] = useState(false);

  async function openMail() {
    try {
      await Linking.openURL(buildFeedbackMailto(getAppInfo()));
      setNoMailApp(false);
    } catch {
      setNoMailApp(true);
    }
  }

  return (
    <>
      <ListRow
        title="Send tilbakemelding"
        meta="Feil, ønsker eller ris og ros"
        onPress={openMail}
      />
      {noMailApp && (
        <>
          <Message tone="muted">Fant ingen e-postapp. Hold inne adressen for å kopiere den:</Message>
          <Text variant="bodyStrong" selectable>{SUPPORT_EMAIL}</Text>
        </>
      )}
    </>
  );
}

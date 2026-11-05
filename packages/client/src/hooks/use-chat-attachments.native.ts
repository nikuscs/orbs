import { ATTACHMENT } from '@repo/contracts/universal';
import { m } from '@repo/i18n/client';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { chatReadPicked } from '../services/chat/chat.native';
import { chatFileType } from '../services/chat/chat.utils';
import { useChatUploads } from './use-chat-uploads';
import type { ChatAttachmentsPlatformParams, ChatPicked } from '../types/chat.types';

export function useChatAttachmentsNative({ botId, onProblem }: ChatAttachmentsPlatformParams) {
  const files = useChatUploads<ChatPicked>({
    botId,
    describe: (picked) => picked,
    preview: (picked) => (picked.mediaType.startsWith('image/') ? picked.uri : ''),
    read: chatReadPicked,
    onFailed: (item) => onProblem(m.mobile_chat_attach_failed({ name: item.name })),
    onProblem,
  });

  const addPhotos = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      files.add(result.assets.map((asset) => {
        const name = asset.fileName ?? asset.uri.split('/').at(-1) ?? '';

        return {
          uri: asset.uri,
          name,
          mediaType: chatFileType({ name, mediaType: asset.mimeType }),
          size: asset.fileSize ?? 0,
        };
      }));
    }
  };

  const pickPhotos = async () => addPhotos(await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: files.remaining,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  }));

  const takePhoto = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();

    if (!granted) {
      onProblem(m.mobile_chat_attach_camera_denied());
      return;
    }

    addPhotos(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] }));
  };

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: [...ATTACHMENT.mediaTypes], multiple: true });

    if (!result.canceled) {
      files.add(result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mediaType: chatFileType({ name: asset.name, mediaType: asset.mimeType }),
        size: asset.size ?? 0,
      })));
    }
  };

  return { ...files, pickPhotos, takePhoto, pickFiles };
}


export function unSignString(str: string | undefined): string {
   if (str == undefined) return '';

   const diacriticsMap: Record<string, string> = {
      a: 'àáạảãâầấậẩẫăằắặẳẵ',
      e: 'èéẹẻẽêềếệểễ',
      i: 'ìíịỉĩ',
      o: 'òóọỏõôồốộổỗơờớợởỡ',
      u: 'ùúụủũưừứựửữ',
      y: 'ỳýỵỷỹ',
      d: 'đ',
   };
   for (const char in diacriticsMap) {
      const diacritics = diacriticsMap[char];
      const regex = new RegExp(`[${diacritics}]`, 'g');
      str = str.replace(regex, char);
   }
   return str.trim().toLowerCase();
}

export function removeSigns(text: string): string {
   const vnSigns = [
      'à', 'á', 'ạ', 'ả', 'ã', 'â', 'ầ', 'ấ', 'ậ', 'ẩ', 'ẫ', 'ă', 'ằ', 'ắ', 'ặ', 'ẳ', 'ẵ',
      'đ',
      'è', 'é', 'ẹ', 'ẻ', 'ẽ', 'ê', 'ề', 'ế', 'ệ', 'ể', 'ễ',
      'ì', 'í', 'ị', 'ỉ', 'ĩ',
      'ò', 'ó', 'ọ', 'ỏ', 'õ', 'ô', 'ồ', 'ố', 'ộ', 'ổ', 'ỗ', 'ơ', 'ờ', 'ớ', 'ợ', 'ở', 'ỡ',
      'ù', 'ú', 'ụ', 'ủ', 'ũ', 'ư', 'ừ', 'ứ', 'ự', 'ử', 'ữ',
      'ỳ', 'ý', 'ỵ', 'ỷ', 'ỹ',
      'À', 'Á', 'Ạ', 'Ả', 'Ã', 'Â', 'Ầ', 'Ấ', 'Ậ', 'Ẩ', 'Ẫ', 'Ă', 'Ằ', 'Ắ', 'Ặ', 'Ẳ', 'Ẵ',
      'Đ',
      'È', 'É', 'Ẹ', 'Ẻ', 'Ẽ', 'Ê', 'Ề', 'Ế', 'Ệ', 'Ể', 'Ễ',
      'Ì', 'Í', 'Ị', 'Ỉ', 'Ĩ',
      'Ò', 'Ó', 'Ọ', 'Ỏ', 'Õ', 'Ô', 'Ồ', 'Ố', 'Ộ', 'Ổ', 'Ỗ', 'Ơ', 'Ờ', 'Ớ', 'Ợ', 'Ở', 'Ỡ',
      'Ù', 'Ú', 'Ụ', 'Ủ', 'Ũ', 'Ư', 'Ừ', 'Ứ', 'Ự', 'Ử', 'Ữ',
      'Ỳ', 'Ý', 'Ỵ', 'Ỷ', 'Ỹ'
   ];
   const vnUnsigns = [
      'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a', 'a',
      'd',
      'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',
      'i', 'i', 'i', 'i', 'i',
      'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o', 'o',
      'u', 'u', 'u', 'u', 'u', 'u', 'u', 'u', 'u', 'u', 'u',
      'y', 'y', 'y', 'y', 'y',
      'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A',
      'D',
      'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E',
      'I', 'I', 'I', 'I', 'I',
      'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O',
      'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U', 'U',
      'Y', 'Y', 'Y', 'Y', 'Y'
   ];

   const replacements: Record<string, string> = {};
   for (let i = 0; i < vnSigns.length; i++) {
      replacements[vnSigns[i]] = vnUnsigns[i];
   }

   const newArray: string[] = text.replace(
     new RegExp(vnSigns.join('|'), 'g'), (c: string) => replacements[c]
   ).split(', ');

   const result: string = newArray.join(', ');
   return result.trim();
}

/**
 * Tạo ID random local
 * */
export function generateLocalId(): string {
   const matId = Math.floor(Math.random() * 100);
   const string = `xxxxxxxxxxxx${ matId }xxxyxxxxxxxxxxxxxxx`;
   return string.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
   });
}

/**
 * Hàm xử lý cắt chuỗi dựa vào delimiter truyền vào
 * VD: string = " 12345 \n 67890 \n \n 54321 ";
 * */
export function explodeString(string: string, delimiter: string = '\n'): string[] {
   if (!string) {
      return [];
   }

   return string
     .split(delimiter)
     .map(str => str.trim())
     .filter(str => str);
}

/**
 * Loại bỏ khoảng space trong string
 * */
export function trimString(value: string) {
   return value ? value.trim().replace(/\s+/g, ' ') : value;
}

/**
 * Chuyển in hoa cho chữ cái đầu tiên
 * */
export function capitalizeFirstLetter(input: string): string {
   return input.charAt(0).toUpperCase() + input.slice(1);
}

export function generateRandomStr(length = 10) {
   let result = '';
   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   const charactersLength = characters.length;
   let counter = 0;
   while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
   }
   return result;
}


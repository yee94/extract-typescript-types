export const getUrlParam = paraName => {
  // @ts-ignore
  const url = document.location.toString();
  const arrObj = url.split("?");

  if (arrObj.length > 1) {
    const arrPara = arrObj[1].split("&");
    let arr;

    for (const param of arrPara) {
      arr = param.split("=");
      if (arr !== null && arr[0] === paraName) {
        return arr[1];
      }
    }
    return "";
  }
  return "";
};

export const isTextEmpty = text => !!text && text !== "";

export function stopPropagation(event: any) {
  event.stopPropagation();
}

export const getItemByPos = (pos, options) => {
  if (!pos || !options) {
    return null;
  }
  return pos
    .split("-")
    .slice(1)
    .reduce((ret, num) => ret.children[num], { children: options });
};

export const getLevel = pos => {
  return pos ? pos.split("-").length - 1 : 0;
};

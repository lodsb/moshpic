# moshpic (data moshing moshpits with pics)

Encode [JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON) (or any text data) into an image (cf. [QR Codes](https://en.wikipedia.org/wiki/QR_code) or the [Free Speech Flag](https://en.wikipedia.org/wiki/AACS_encryption_key_controversy)).

[LIVE](http://playground.lodsb.org/moshpic/example.html) check the code in the inspector.

## use
- needs canvas objects to do the work (can be hidden)
- currently needs [LZString](http://pieroxy.net/blog/pages/lz-string/index.html) and [underscore.js](http://underscorejs.org/) (added in the repo). These dependencies could be removed in the future.
### functions
- encode(canvasElement, string, titleMessage) generates a picture with the info in string (e.g. stringified JSON). The titleMessage is rendered into the center of the pic.
- decode(canvasElement, imageElement), return the data.

### example
```javascript
var canvasEncoder = document.getElementById("canvasEncoder");

 moshpic.encode(canvasEncoder, myJsonString, "supermeng");

// lets put everything into an image
var img = document.getElementById("image");
img.src = canvasEncoder.toDataURL("image/png", 1.0);

var canvasDecoder = document.getElementById("canvasDecoder");
var decodedData = moshpic.decode(canvasDecoder, image);

var decOutCompressDiv = document.getElementById("decOut");
decOutCompressDiv.innerHTML = "<b style=\"color: red\">" + decodedData + "</b>"
```

# License: MIT

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../utils/constants.dart';

class ProductImage extends StatelessWidget {
  final String? element;
  final double? size;
 final  double? radius;
  const ProductImage({Key? key, this.element, this.size, this.radius})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
        height: size ?? 200,
        width: size ?? 200,
        child: element != null && element!.isNotEmpty && element!.length > 30
            ? ClipRRect(
                borderRadius: BorderRadius.circular(radius ?? 5),
                child: CachedNetworkImage(
                  placeholder: (context, url) => Center(
                    child: SizedBox(
                        height: size ?? 200,
                        width: size ?? 200,
                        child: Image.asset(imageplaceholder)),
                  ),
                  filterQuality: FilterQuality.high,
                  height: size ?? 200,
                  width: size ?? 200,
                  imageUrl: element!,
                  fit: BoxFit.cover,
                ),
              )
            : ClipRRect(
                borderRadius: BorderRadius.circular(radius ?? 5),
                child: Image.asset(
                  imageplaceholder,
                  height: size ?? 200,
                  width: size ?? 200,
                  fit: BoxFit.cover,
                ),
              ));
  }
}

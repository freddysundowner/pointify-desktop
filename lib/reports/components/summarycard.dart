import 'package:flutter/material.dart';

import '../../functions/functions.dart';

Widget summaryCard(
    {String title = "",
    String description = "",
    var amount = 0,
    String key = "",
    Widget? widget,
    required Function onPressed}) {
  return InkWell(
    onTap: () {
      onPressed(key);
    },
    child: Column(
      children: [
        Container(
          margin: const EdgeInsets.only(bottom: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(color: Colors.black, fontSize: 18),
                    ),
                    if (description.isNotEmpty) const SizedBox(height: 3),
                    if (description.isNotEmpty)
                      Text(
                        description,
                        style:
                            const TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                  ],
                ),
              ),
              if (widget == null)
                Text(
                  htmlPrice(amount),
                  style: const TextStyle(
                      color: Colors.black,
                      fontSize: 19,
                      fontWeight: FontWeight.bold),
                ),
              if (widget != null) widget
            ],
          ),
        ),
        if ((key != "hold" && key != "badstock") && key != "end")
          const Divider(
            height: 1,
            color: Colors.grey,
          ),
        const SizedBox(
          height: 10,
        )
      ],
    ),
  );
}

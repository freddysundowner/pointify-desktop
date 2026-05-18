import 'package:flutter/cupertino.dart';

Widget bottomWidgetCountView({required count, required qty, onCredit, cash}) {
  return SizedBox(
    height: 40,
    child: Row(
      children: [
        const SizedBox(
          width: 10,
        ),
        Column(
          children: [
            const Text("Items"),
            Text(
              count,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            )
          ],
        ),
        const SizedBox(
          width: 20,
        ),
        Column(
          children: [
            const Text("Qty"),
            Text(
              qty,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            )
          ],
        ),
        const SizedBox(
          width: 20,
        ),
        if (onCredit != null)
          Column(
            children: [
              const Text("On credit"),
              Text(
                onCredit.toString(),
                style:
                    const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
              )
            ],
          ),
        const Spacer(),
        Column(
          children: [
            const Text("Total"),
            Text(
              cash.toString(),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            )
          ],
        ),
        const SizedBox(
          width: 10,
        ),
      ],
    ),
  );
}

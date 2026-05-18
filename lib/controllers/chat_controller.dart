import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_chat_types/flutter_chat_types.dart' as types;
import 'package:get/get.dart';
import 'package:uuid/uuid.dart';

import '../main.dart';
import '../models/chat.dart';
import '../models/chat_message_type.dart';

class ChatController extends GetxController {
  /* Variables */
  RxList<Chat> chatList = RxList([]);

  /* Controllers */
  late final ScrollController scrollController = ScrollController();
  late final TextEditingController textEditingController =
      TextEditingController();
  late final FocusNode focusNode = FocusNode();
  FirebaseFirestore firebaseFirestore = FirebaseFirestore.instance;

  @override
  void onInit() {
    // TODO: implement onInit
    super.onInit();
  }

  void loadMessages() async {
    firebaseFirestore
        .collection("chats")
        .doc(userController.currentUser.value!.id)
        .update({
      "unreadUsers":
          FieldValue.arrayRemove([userController.currentUser.value!.id]),
      userController.currentUser.value!.id!: 0
    });


    QuerySnapshot response = await firebaseFirestore
        .collection("chats")
        .doc(userController.currentUser.value!.id)
        .collection("messages")
        .orderBy("createdAt", descending: true)
        .get();
    List<Chat> messages = response.docs
        .map((e) => Chat(
              message: e["text"],
              type: ["id"].toString() == userController.currentUser.value!.id
                  ? ChatMessageType.received
                  : ChatMessageType.sent,
              time: DateTime.now().subtract(const Duration(minutes: 15)),
            ))
        .toList();

    chatList.addAll(messages);

    firebaseFirestore
        .collection("chats")
        .doc(userController.currentUser.value!.id)
        .collection("messages")
        .orderBy("createdAt", descending: true)
        .snapshots()
        .listen((event) {
      chatList.clear();
      List<Chat> messages = event.docs
          .map((e) => Chat(
                message: e.data()["text"],
                type: e.data()["id"] == userController.currentUser.value!.id
                    ? ChatMessageType.received
                    : ChatMessageType.sent,
                time: DateTime.now().subtract(const Duration(minutes: 15)),
              ))
          .toList();
      chatList.addAll(messages);

    });
  }

  /* Intents */
  Future<void> onFieldSubmitted() async {
    if (!isTextFieldEnable) return;

    // 1. chat list에 첫 번째 배열 위치에 put
    // chatList = [
    //   ...chatList,
    //   Chat.sent(message: textEditingController.text),
    // ];

    // 2. 스크롤 최적화 위치
    // 가장 위에 스크롤 된 상태에서 채팅을 입력했을 때 최근 submit한 채팅 메세지가 보이도록
    // 스크롤 위치를 가장 아래 부분으로 변경
    scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
    final user = types.User(
      id: userController.currentUser.value!.id!,
    );
    final textMessage = types.TextMessage(
      author: user,
      createdAt: DateTime.now().millisecondsSinceEpoch,
      id: const Uuid().v4(),
      text: textEditingController.text,
    );
    textEditingController.text = '';
    // notifyListeners();

    _sendFirebaseMessage(textMessage.toJson());

    // _addMessage(textMessage);
  }

  void onFieldChanged(String term) {
    // notifyListeners();
  }

  _sendFirebaseMessage(data) {
    firebaseFirestore
        .collection("chats")
        .doc(userController.currentUser.value!.id)
        .collection("messages")
        .add(data);
    firebaseFirestore
        .collection("chats")
        .doc(userController.currentUser.value!.id)
        .get()
        .then((value) {
      if (value.data() != null) {
        firebaseFirestore
            .collection("chats")
            .doc(userController.currentUser.value!.id)
            .update({
          "lastmessage": data,
          "unreadUsers":
              FieldValue.arrayUnion([userController.currentUser.value!.id])
        });
      } else {
        firebaseFirestore
            .collection("chats")
            .doc(userController.currentUser.value!.id)
            .set({
          "lastmessage": data,
          "unreadUsers":
              FieldValue.arrayUnion([userController.currentUser.value!.id])
        });
      }
    });
    // firebaseFirestore
    //     .collection("chats")
    //     .doc(userController.currentUser.value!.id)
    //     .update({
    //   "unreadUsers":
    //       FieldValue.arrayUnion([userController.currentUser.value!.id]),
    //   "lastmessage": data
    // });
  }

  /* Getters */
  bool get isTextFieldEnable => textEditingController.text.isNotEmpty;
}

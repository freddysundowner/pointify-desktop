import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/material.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/services/preference_manager.dart';

import '../widgets/snackBars.dart';

class DbBase {
  final postRequestType = "POST";
  final getRequestType = "GET";
  final putRequestType = "PUT";
  final patchRequestType = "PATCH";
  final deleteRequestType = "DELETE";

  final Dio _dio = Dio();

  DbBase() {
    _dio.httpClientAdapter = IOHttpClientAdapter(createHttpClient: () {
      final HttpClient client =
          HttpClient(context: SecurityContext(withTrustedRoots: false));
      client.badCertificateCallback =
          (X509Certificate cert, String host, int port) => true;
      return client;
    });

    _dio.options.validateStatus = (_) => true;
    _dio.options.headers['Connection'] = 'keep-alive';
  }

  Future databaseRequest(
    String link,
    String type, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
    ResponseType responseType = ResponseType.json,
  }) async {
    try {
      final prefs = PreferenceManager();
      headers ??= {
        'Content-Type': 'application/json',
        "Authorization": "Bearer ${await prefs.getString('user_token')}",
      };

      int maxRetries = 3; // Maximum number of retry attempts
      int retryDelayInSeconds = 3; // Delay in seconds between retries

      Response response;
      debugPrintMessage(link);

      for (int retryCount = 0; retryCount < maxRetries; retryCount++) {
        try {
          switch (type) {
            case "GET":
              response = await _dio.get(link,
                  queryParameters: body,
                  options: Options(
                    headers: headers,
                    responseType: responseType,
                  ));
              break;
            case "POST":
              response = await _dio.post(link,
                  data: body,
                  options: Options(
                    headers: headers,
                    responseType: responseType,
                  ));
              break;
            case "PUT":
              response = await _dio.put(link,
                  data: body,
                  options: Options(
                    headers: headers,
                    responseType: responseType,
                  ));
              break;
            case "PATCH":
              response = await _dio.patch(link,
                  data: body,
                  options: Options(
                    headers: headers,
                    responseType: responseType,
                  ));
              break;
            case "DELETE":
              response = await _dio.delete(link,
                  data: body,
                  options: Options(
                    headers: headers,
                    responseType: responseType,
                  ));
              break;
            default:
              throw DioException(
                  requestOptions: RequestOptions(path: link),
                  error: "Invalid request type");
          }

          return response.data;
        } on DioException catch (e) {
          debugPrintMessage('Dio Error: $e');
          // Retry only for certain DioError conditions, you can customize this
          if (e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.sendTimeout ||
              e.type == DioExceptionType.receiveTimeout) {
            await Future.delayed(Duration(seconds: retryDelayInSeconds));
          } else {
            // Do not retry for other DioError conditions
            break;
          }
        } catch (e) {
          showSnackBar(
            message: "$e",
            color: Colors.red,
          );
          break;
        }
      }
      throw Exception("Failed to connect after multiple retries");
    } catch (e) {
      debugPrintMessage(e);
    }
  }
}

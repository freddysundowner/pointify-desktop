import 'client.dart';
import 'end_points.dart';

class SettingsApi {

  static var getSettings = ({String? type}) async {
    String url = "${EndPoints.setting}?type=${type ?? ""}";
    var response = await DbBase()
        .databaseRequest(url, DbBase().getRequestType);
    return response;
  };

  static Future getThemes() async {
    String url = EndPoints.theme;
    var response = await DbBase()
        .databaseRequest(url, DbBase().getRequestType);
    return response;
  }
}
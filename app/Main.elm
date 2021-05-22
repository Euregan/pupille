port module Main exposing (..)

import Browser
import Config exposing (Config)
import Html exposing (Html, button, div, img, text)
import Html.Attributes exposing (src)
import Html.Events exposing (onClick)
import Json.Decode as Decode exposing (Error, decodeValue, errorToString)
import Json.Encode exposing (Value)
import Test exposing (Test)


main : Program Config Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


type alias Model =
    { tests : List Test
    , error : Maybe Error
    , config : Config
    }


init : Config -> ( Model, Cmd Msg )
init config =
    ( { config = config, tests = [], error = Nothing }, Cmd.none )


port testsUpdated : (Json.Encode.Value -> msg) -> Sub msg


type Msg
    = TestsUpdated (Result Error (List Test))


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        TestsUpdated (Ok tests) ->
            ( { model | tests = tests, error = Nothing }, Cmd.none )

        TestsUpdated (Err error) ->
            ( { model | error = Just error }, Cmd.none )


view : Model -> Html Msg
view model =
    case model.error of
        Nothing ->
            div [] (List.map (Test.view model.config) model.tests)

        Just error ->
            div [] [ text <| errorToString error ]


subscriptions : Model -> Sub Msg
subscriptions _ =
    testsUpdated (\raw -> TestsUpdated <| decodeValue (Decode.list Test.decoder) raw)
